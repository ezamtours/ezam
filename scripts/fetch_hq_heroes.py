#!/usr/bin/env python3
"""Download full-resolution original travel photographs for EZAM's GitHub Pages build.
The JPGs become first-party Pages assets. No site visitor requests photos from Unsplash.
Requires only Python standard library and internet access (GitHub Actions supplies both).
"""
import argparse
import pathlib
import sys
import time
import urllib.request

PHOTOS = [
    # (destination, original Unsplash image ID, photographer)
    ('philippines','1753482774971-9d99f726bbe0','Matthew Stephenson'),
    ('japan','1779887609927-734b1cf1a768','Takashi Miyazaki'),
    ('south-korea','1651836170569-8458c314a841','NK Lee'),
    ('singapore','1559329007-23db90ef9f73','K8'),
    ('bali','1604999333679-b86d54738315','Guillaume Marques'),
]

def jpeg_dimensions(blob):
    if blob[:2] != b"\xff\xd8": raise ValueError("Response is not a JPEG image")
    i = 2
    SOF = {0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf}
    while i < len(blob)-10:
        if blob[i] != 0xff:
            i += 1; continue
        while i < len(blob) and blob[i] == 0xff: i += 1
        if i >= len(blob): break
        marker = blob[i]; i += 1
        if marker in [0xd8,0xd9,0x01] or 0xd0 <= marker <= 0xd7: continue
        if i+2>len(blob):break
        seglen = int.from_bytes(blob[i:i+2],"big")
        if seglen<2 or i+seglen>len(blob):break
        if marker in SOF:
            return (int.from_bytes(blob[i+5:i+7],"big"),int.from_bytes(blob[i+3:i+5],"big"))
        i+=seglen
    raise ValueError("JPEG image dimensions could not be read")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output-dir",default="assets/images")
    parser.add_argument("--dry-run", action="store_true")
    args=parser.parse_args()
    out=pathlib.Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    for name, photoid, author in PHOTOS:
        dest=out/f"hero-{name}-real-3200.jpg"
        url=f"https://images.unsplash.com/photo-{photoid}?fit=crop&w=3200&q=88&fm=jpg"
        if args.dry_run:
            print(f"{dest} <- {url} ({author})")
            continue
        if dest.exists():
            try:
                dims=jpeg_dimensions(dest.read_bytes())
                if dims[0]>=2400 and dims[1]>=1200:
                    print(f"KEEP {dest} {dims[0]}x{dims[1]}")
                    continue
            except (ValueError,OSError):pass
        last=None
        for attempt in range(3):
            try:
                request=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 EZAM-Travel-Site-Build/1.0","Accept":"image/jpeg"})
                with urllib.request.urlopen(request,timeout=55) as response:
                    content_type=response.headers.get("Content-Type","")
                    if "image/" not in content_type: raise ValueError(f"Unexpected type {content_type}")
                    image=response.read(15_000_001)
                if len(image)>15_000_000:raise ValueError("Image exceeds 15 MB")
                if len(image)<200_000:raise ValueError(f"Image too small ({len(image)} bytes)")
                width,height=jpeg_dimensions(image)
                if width<2400 or height<1200:raise ValueError(f"Actual image insufficient for hero: {width}x{height}")
                tmp=dest.with_suffix(".tmp");tmp.write_bytes(image);tmp.replace(dest)
                print(f"OK {dest} {width}x{height} {len(image)//1024} KB - {author}")
                last=None
                break
            except Exception as exc:
                last=exc
                print(f"Attempt {attempt+1} failed for {name}: {exc}",file=sys.stderr)
                time.sleep(2*(attempt+1))
        if last is not None:
            print(f"ERROR: Failed to obtain an authentic high-resolution image for {name}; stopping deployment instead of publishing fuzzy fallback.",file=sys.stderr)
            sys.exit(1)
    print("All five full-resolution photographs ready for deployment.")

if __name__=="__main__":main()
