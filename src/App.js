import logo from './logo.svg';
// import ukulele from './ukulele.webp';
import { useEffect, useState } from 'react';
import './App.css';

const NOTE_NAMES = 'C C# D D# E F F# G G# A A# B'.split(' ');

// https://newt.phys.unsw.edu.au/jw/notes.html
const freq_to_number = (f) => 69 + 12 * Math.log2(f / 440.0);
const note_name = (n) => NOTE_NAMES[n % 12] + Math.round(n / 12 - 1);
let detected = false;

function analyzeAudio(stream, setFrequency, setDone) {
  const audioContext = new window.AudioContext();
  const analyzer = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);
  const frequencies = new Uint8Array(analyzer.frequencyBinCount);

  let state = [null, 0];

  microphone.connect(analyzer);
  analyzer.fftSize = 16384;

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

      if (slice[argmax] > 100) {
        detected = true;
        setFrequency(Math.round(freq));

        const [note, err] = error(freq);

        if (state == null) {
          state = [note, 0];
        }

        if (Math.abs(err) < 2 && state[0] == note) {
          if (++state[1] == 7) {
            setDone(state);
          }
        } else {
          state = null;
        }
      } else {
        setFrequency(null);
      }
    }
  }
  analyze();
}

function display(frequency) {
  if (frequency === null) {
    return detected ? "&nbsp;" : "Play any string to start tuning";
  }
  const n0 = Math.round(freq_to_number(frequency));
  return `${Math.round(frequency)} hZ    (${note_name(n0)})`;
}

function error(frequency) {
  // A string: 440 Hz
  // E string: 329.63 Hz
  // C string: 261.63 Hz
  // G string: 392 Hz

  if (frequency == null) {
    return [0, 0];
  }

  const notes = [392, 261.63, 329.63, 440];

  const errors = notes.map(x => Math.abs(frequency - x));
  let i = errors.indexOf(Math.min(...errors)); // find index that minimizes errors

  return [i, frequency - notes[i]]
}

function App() {
  const [frequency, setFrequency] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      analyzeAudio(await navigator.mediaDevices.getUserMedia({ audio: true }), setFrequency, setDone);
    })();
  }, []);

  const audio = new Audio("/109663__grunz__success_low.wav")

  let time = null;
  useEffect(() => {
    console.log(done);
    if (done != null) {
      const [note, _] = done;
      const e = document.querySelector(`.note-icon-${note + 1}`);
      if (!e.classList.contains('note-done')) {
        audio.play();
        e.classList.add('note-done');
      }
    }
  }, [done]);

  return (
    <div className="App">
      <div className="background-container">
        <div className="background"></div>
      </div>
      <div className="note-icon note-icon-1">G</div>
      <div className="note-icon note-icon-2">C</div>
      <div className="note-icon note-icon-3">E</div>
      <div className="note-icon note-icon-4">A</div>
      <div className="midline"></div>
      <div className="pick-container">
        <div style={{ marginLeft: 10 * error(frequency)[1] }} className="pick"></div>
        <p dangerouslySetInnerHTML={{ __html: display(frequency) }}></p>
      </div>
    </div>
  );
}

export default App;
