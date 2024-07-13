import logo from './logo.svg';
import { useEffect, useState } from 'react';
import './App.css';

const NOTE_NAMES = 'C C# D D# E F F# G G# A A# B'.split(' ');

// https://newt.phys.unsw.edu.au/jw/notes.html
const freq_to_number = (f) => 69 + 12 * Math.log2(f / 440.0);
const note_name = (n) => NOTE_NAMES[n % 12] + Math.round(n / 12 - 1);

function analyzeAudio(stream, setData) {
  const audioContext = new window.AudioContext();
  const analyzer = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);
  const frequencies = new Uint8Array(analyzer.frequencyBinCount);

  microphone.connect(analyzer);
  analyzer.fftSize = 16384 * 2;

  let count = 0;
  function analyze() {
    requestAnimationFrame(analyze);

    count += 1;
    if (count == 6) {
      count = 0;

      analyzer.getByteFrequencyData(frequencies);

      // For example: 44'100 / 2048 = 21.53 hz per bin in FFT.
      const HERTZ_PER_BIN = audioContext.sampleRate / analyzer.fftSize;

      // A4 string: 440.00 Hz
      // C4 string: 261.63 Hz
      //
      // Only consider frequencies between lowest and highest string. ±4 bins
      // for some wiggle room.
      const lo = 261.63 / HERTZ_PER_BIN - 4
      const hi = 440.00 / HERTZ_PER_BIN + 4;

      const slice = frequencies.slice(lo, hi);
      const argmax = slice.indexOf(Math.max(...slice));
      const freq = (argmax + lo) * HERTZ_PER_BIN;

      const n = freq_to_number(freq);
      const n0 = Math.round(n);
      // setData(`${Math.round(freq)} hZ    ${note_name(n0)} ±${(n - n0).toFixed(2)}`);

      if (slice[argmax] > 100) {
        setData(`${Math.round(freq)} hZ    (${note_name(n0)})`);
      } else {
        setData("nothing");
      }
    }
  }
  analyze();
}

function App() {
  const [frequencyData, setFrequencyData] = useState(null);

  useEffect(() => {
    (async () => {
      analyzeAudio(await navigator.mediaDevices.getUserMedia({ audio: true }), setFrequencyData);
    })();
  }, []);

  // <a
  //   className="App-link"
  //   href="https://reactjs.org"
  //   target="_blank"
  //   rel="noopener noreferrer"
  // >
  //   Learn More
  // </a>

  return (
    <div className="App">
      <div className="background-container">
        <div className="background"></div>
      </div>
      <img src={logo} className="App-logo" alt="logo" />
      <p>{frequencyData}</p>
    </div>
  );
}

export default App;
