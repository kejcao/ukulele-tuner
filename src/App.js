import { useEffect, useState } from 'react';
import './App.css';

const NOTE_NAMES = 'C C# D D# E F F# G G# A A# B'.split(' ');

// https://newt.phys.unsw.edu.au/jw/notes.html
const freqToNumber = (f) => 69 + 12 * Math.log2(f / 440.0);
const noteName = (n) => NOTE_NAMES[n % 12] + Math.round(n / 12 - 1);

let showStartingMessage = true;

function analyzeAudio(stream, setFrequency, setMatchedNote) {
  const audioContext = new window.AudioContext();
  const analyzer = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);
  const frequencies = new Uint8Array(analyzer.frequencyBinCount);

  let noteStreak = [null, 0];

  microphone.connect(analyzer);
  analyzer.fftSize = 32768;

  function analyze() {
    requestAnimationFrame(analyze);

    analyzer.getByteFrequencyData(frequencies);

    // For example: 44100 / 32768 = 1.3458 hz per bin in FFT.
    const HERTZ_PER_BIN = audioContext.sampleRate / analyzer.fftSize;

    // A4 string: 440.00 Hz
    // C4 string: 261.63 Hz
    //
    // Only consider frequencies between lowest and highest string. ±8 bins
    // for some wiggle room.
    const lo = 261.63 / HERTZ_PER_BIN - 8
    const hi = 440.00 / HERTZ_PER_BIN + 8;

    const slice = frequencies.slice(lo, hi);
    const argmax = slice.indexOf(Math.max(...slice));
    const freq = (argmax + lo) * HERTZ_PER_BIN;

    if (slice[argmax] > 120) {
      showStartingMessage = false;
      setFrequency(Math.round(freq));

      const [note, err] = error(freq);

      if (noteStreak == null) {
        noteStreak = [note, 0];
      }

      if (Math.abs(err) < 2 && noteStreak[0] === note) {
        if (++noteStreak[1] === 16) {
          setMatchedNote(noteStreak);
        }
      } else {
        noteStreak = null;
      }
    } else {
      setFrequency(null);
    }
  }
  analyze();
}

function display(frequency) {
  if (frequency === null) {
    return showStartingMessage ? "Play any string to start tuning" : "&nbsp;";
  }
  const n0 = Math.round(freqToNumber(frequency));
  return `${Math.round(frequency)} hZ    (${noteName(n0)})`;
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
  const [matchedNote, setMatchedNote] = useState(null);

  const successAudio = new Audio("/109663__grunz__success_low.wav")

  useEffect(() => {
    (async () => {
      analyzeAudio(await navigator.mediaDevices.getUserMedia({ audio: true }), setFrequency, setMatchedNote);
    })();
  }, []);

  useEffect(() => {
    if (matchedNote !== null) {
      const [note, _] = matchedNote;
      const e = document.querySelector(`.note-icon-${note + 1}`);
      if (!e.classList.contains('note-done')) {
        successAudio.play();
        e.classList.add('note-done');
      }
    }
  }, [matchedNote]);

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
        <div style={{ marginLeft: 16 * error(frequency)[1] }} className="pick"></div>
        <p dangerouslySetInnerHTML={{ __html: display(frequency) }}></p>
      </div>
    </div>
  );
}

export default App;
