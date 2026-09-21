"""Offline browser rendering of production light/medium/heavy contact sounds.

Uses original local samples and real Web Audio filters/envelopes, without opening
the owner's browser session. Reports waveform evidence, not device speaker feel.
"""
import base64
import json
import subprocess
import wave
from pathlib import Path

import numpy as np
from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1]
OUT = APP / "evidence" / "material-physics-v42-audio"
OUT.mkdir(parents=True, exist_ok=True)
RATE = 44100

def write_wav(path, samples):
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())

results, sequence = [], []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context()
    context.route("**/impact-audio-v42-fixture", lambda route: route.fulfill(content_type="text/html", body="<!doctype html><title>Audio fixture</title>"))
    page = context.new_page()
    page.goto("http://127.0.0.1:5114/impact-audio-v42-fixture", wait_until="networkidle")
    for engine in ["samples", "fallback"]:
        for material in ["glass", "pearl", "resin", "metal"]:
            material_results = []
            for label, intensity in [("light", .15), ("medium", .5), ("heavy", .9)]:
                encoded = page.evaluate("""async ({engine,material,intensity})=>{
                  const {createSampleSound}=await import('/src/sample-sound.js');
                  const {createGameSound}=await import('/src/game-sound.js');
                  const context=new OfflineAudioContext(2,Math.ceil(44100*.7),44100);
                  const sound=engine==='samples'?createSampleSound(context):createGameSound(context);
                  if(sound.ready)await sound.ready;
                  sound.play('impact','pearl',0,{materialFamily:material,intensity,x:.5,materialPair:[material,'glass']});
                  const rendered=await context.startRendering();
                  return [0,1].map(channel=>{const bytes=new Uint8Array(rendered.getChannelData(channel).buffer);let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value);});
                }""", {"engine": engine, "material": material, "intensity": intensity})
                stereo = np.column_stack([np.frombuffer(base64.b64decode(channel), dtype="<f4") for channel in encoded])
                mono = stereo.mean(axis=1)
                power = mono.astype(np.float64) ** 2
                peak = float(np.max(np.abs(mono)))
                rms = float(np.sqrt(np.mean(power)))
                spectrum = np.abs(np.fft.rfft(mono)) ** 2
                frequencies = np.fft.rfftfreq(len(mono), 1 / RATE)
                centroid = float(np.sum(spectrum * frequencies) / max(np.sum(spectrum), 1e-20))
                decay = float(np.searchsorted(np.cumsum(power), np.sum(power) * .95) / RATE)
                name = f"{engine}-{material}-{label}.wav"
                write_wav(OUT / name, stereo)
                sequence.extend([stereo, np.zeros((int(RATE * .12), 2))])
                record = {"engine": engine, "material": material, "intensity": intensity, "file": name,
                          "peakDb": round(20 * np.log10(max(peak, 1e-12)), 2), "rmsDb": round(20 * np.log10(max(rms, 1e-12)), 2),
                          "spectralCentroidHz": round(centroid, 1), "energy95Seconds": round(decay, 4)}
                results.append(record)
                material_results.append(record)
                assert peak > 0 and peak < .95, record
            assert material_results[0]["peakDb"] < material_results[-1]["peakDb"], material_results
            assert material_results[0]["rmsDb"] < material_results[-1]["rmsDb"], material_results
            for key in ["peakDb", "rmsDb", "spectralCentroidHz", "energy95Seconds"]:
                assert all(left[key] <= right[key] for left, right in zip(material_results, material_results[1:])), (key, material_results)
    browser.close()

write_wav(OUT / "contact-comparison.wav", np.concatenate(sequence))
subprocess.run(["rtk", "proxy", "ffmpeg", "-v", "error", "-y", "-i", str(OUT / "contact-comparison.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(OUT / "contact-comparison.mp3")], check=True)
report = {"runtime": "Chromium OfflineAudioContext 44100Hz stereo", "physicalDevice": False,
          "order": "samples then fallback; glass, pearl, resin, metal; each light, medium, heavy",
          "checks": ["24 production cues rendered", "no clipping", "light-medium-heavy peak and RMS monotonic", "spectral brightness monotonic", "energy decay time nondecreasing"], "measurements": results}
(OUT / "report.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
