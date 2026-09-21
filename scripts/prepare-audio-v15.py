"""Process the four verified public HQ MP3s; never fetch or overwrite originals.

Usage: python3 scripts/prepare-audio-v15.py /path/to/download-directory
Prints provenance for review. Binary outputs are versioned; source MP3s stay private.
"""
import argparse
import array
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import wave

SOURCES = [
    ('beads', 'Anthousai', '399006', '5923045', 'glass beads 02.wav', [(0, .30), (3.02, .30), (6.07, .30)]),
    ('wood', 'Solar01', '661650', '14490715', 'Glass Marbles Rolling on Wood.wav', [(.76, .44), (1.62, .44), (2.86, .44)]),
    ('clink', 'AardsReal', '842180', '13307919', 'Glass Clink Free', [(.665, .48)]),
    ('wind', 'SamuelGremaud', '544844', '8031303', 'WIND AND LEAVES', []),
]
RATE = 48000

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def prepare(directory):
    app = Path(__file__).resolve().parents[1]
    raw = app / 'content/audio-sources-v15'
    out = app / 'public/assets/audio'
    raw.mkdir(exist_ok=True)
    out.mkdir(exist_ok=True)
    records = []
    for key, author, sound_id, user_id, title, cuts in SOURCES:
        source = directory / f'{key}-hq.mp3'
        preserved = raw / source.name
        if preserved.exists() and digest(preserved) != digest(source):
            raise ValueError(f'Refusing to overwrite source {preserved}')
        if not preserved.exists():
            shutil.copyfile(source, preserved)
        filter_spec = 'highpass=f=180,lowpass=f=2600' if key == 'wind' else 'highpass=f=70,lowpass=f=12000'
        pcm = array.array('f', subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source), '-af', filter_spec, '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-']))
        if key == 'wind':
            # Seven-second loop: last second crossfades into original first second.
            result = list(pcm[RATE:7*RATE])
            result.extend(pcm[7*RATE+i]*(1-i/RATE) + pcm[i]*(i/RATE) for i in range(RATE))
            scale = .5 / max(abs(x) for x in result)
            result = [x*scale for x in result]
        else:
            result = []
            for start, duration in cuts:
                segment = pcm[round(start*RATE):round((start+duration)*RATE)]
                scale = .72 / max(abs(x) for x in segment)
                for i, x in enumerate(segment):
                    edge = min(1, i/(RATE*.003), (len(segment)-1-i)/(RATE*.025))
                    result.append(x*scale*max(0, edge))
                result.extend([0.] * (round(.65*RATE)-len(segment)))
        target = out / f'{key}-v15.wav'
        encoded = array.array('h', (round(max(-1, min(1, x))*32767) for x in result))
        with wave.open(str(target), 'wb') as stream:
            stream.setnchannels(1); stream.setsampwidth(2); stream.setframerate(RATE); stream.writeframes(encoded.tobytes())
        if key == 'wind':
            compressed = target.with_suffix('.mp3')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(target), '-c:a', 'libmp3lame', '-b:a', '96k', str(compressed)], check=True)
            # This helper's intermediate, not a pre-existing user asset.
            target.unlink()
            target = compressed
        records.append(dict(id=f'lucky-link-audio-{key}-v15', author=author, title=title,
            sourceUrl=f'https://freesound.org/people/{author}/sounds/{sound_id}/',
            downloadUrl=f'https://cdn.freesound.org/previews/{sound_id[:3]}/{sound_id}_{user_id}-hq.mp3',
            licenseId='CC0-1.0', licenseUrl='https://creativecommons.org/publicdomain/zero/1.0/',
            acquiredAt='2026-09-14', quality='Public compressed HQ MP3 preview; not original lossless WAV',
            sourcePath=str(preserved.relative_to(app)), sourceSha256=digest(preserved),
            file=str(target.relative_to(app)), sha256=digest(target), bytes=target.stat().st_size,
            duration=len(result)/RATE, sourceCuts=cuts, slotSeconds=.65 if cuts else None,
            processing=filter_spec+'; mono 48kHz; per-cut peak normalization and edge fades' if cuts else filter_spec+'; mono 48kHz; 1s crossfade; peak normalization; MP3 96kbps',
            review='Source-page CC0 checked by Codex; incorporation approved by owner; final listening pending'))
    print(json.dumps(dict(version='1.5.0', assets=records), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    prepare(parser.parse_args().directory)
