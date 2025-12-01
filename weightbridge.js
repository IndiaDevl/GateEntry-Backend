const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cookie = require('cookie');
const nodemailer = require('nodemailer');
const { SerialPort } = require('serialport');
const EventEmitter = require('events');
const app = express();
const PORT = 3000;

class Weighbridge extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.port = null;
    this.isCapturing = false;
    this.capturedWeights = [];
    this.lastReadWeight = 0;
    this.timer = null;
    this.MIN_WEIGHT = config.minWeight || 0;
    this.latestWeight = 0; // For API endpoint
  }

  openPort() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
    this.port = new SerialPort({
      path: this.config.portName,
      baudRate: this.config.baudRate,
      dataBits: this.config.dataBits,
      parity: this.config.parity,
      stopBits: this.config.stopBits,
      autoOpen: false,
    });

    this.port.on('data', this.onDataReceived.bind(this));
    this.port.on('error', err => console.error('Serial port error:', err));
    this.port.open(err => {
      if (err) {
        console.error('Failed to open port:', err.message);
      } else {
        console.log('Serial port opened:', this.config.portName);
      }
    });
  }

  closePort() {
    if (this.port && this.port.isOpen) {
      this.port.close();
      this.port = null;
    }
    this.lastReadWeight = 0;
  }

  startCapture() {
    this.capturedWeights = [];
    this.isCapturing = true;
    this.lastReadWeight = 0;
    // Optionally, set a timer for timed capture
    if (this.config.captureTime) {
      this.timer = setTimeout(() => this.stopCapture(), this.config.captureTime * 1000);
    }
  }

  stopCapture() {
    this.isCapturing = false;
    if (this.timer) clearTimeout(this.timer);
    this.computeWeight();
    this.capturedWeights = [];
    this.lastReadWeight = 0;
  }

  onDataReceived(data) {
    // Example: parse ASCII or binary data for weight
    // This logic should be adapted to your weighbridge protocol
    const str = data.toString('utf8');
    const match = str.match(/([0-9]{4,})/); // Adjust regex as per your device output
    if (match) {
      const weight = parseInt(match[1], 10);
      if (weight > this.MIN_WEIGHT && this.isCapturing) {
        this.capturedWeights.push(weight);
        if (weight !== this.lastReadWeight) {
          this.lastReadWeight = weight;
          this.emit('weight', weight);
        }
      }
      // Update latest weight for API
      this.latestWeight = weight;
    }
  }

  computeWeight() {
    if (this.capturedWeights.length === 0) {
      this.emit('capturedWeight', 0);
      return;
    }
    // Example: use the most frequent value
    const freq = {};
    this.capturedWeights.forEach(w => freq[w] = (freq[w] || 0) + 1);
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const mostFrequentWeight = parseInt(sorted[0][0], 10);
    this.emit('capturedWeight', mostFrequentWeight);
  }
}

// Usage example:
const config = {
  portName: 'COM1', // or '/dev/ttyUSB0'
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  minWeight: 0,
  captureTime: 5 // seconds
};

const wb = new Weighbridge(config);

wb.on('weight', weight => {
  console.log('Live weight:', weight);
});

wb.on('capturedWeight', weight => {
  console.log('Captured weight:', weight);
});

wb.openPort();
wb.startCapture();

// API endpoint to get latest weight
app.get('/weight', (req, res) => {
  res.json({ weight: wb.latestWeight });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Later, call wb.stopCapture() to process and get the captured weight.