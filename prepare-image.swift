// prepare-image.swift: makes one photo safe and web-sized for the book.
// Usage:  swift prepare-image.swift <input> <output.jpg>
//
// Uses ImageIO (the library under Preview and Photos) to, in one pass:
//   1. turn the picture the way the phone meant it (phones save portraits
//      sideways plus a "rotate me" note; we apply the note to the pixels),
//   2. shrink the long side to 2000px (never enlarge),
//   3. write a fresh JPEG with NO metadata: no GPS location, no phone model.
// Reads anything ImageIO can: HEIC, JPG, PNG.

import Foundation
import ImageIO
import UniformTypeIdentifiers

let LONG_SIDE = 2000
let QUALITY = 0.85

func fail(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
guard args.count == 3 else { fail("usage: swift prepare-image.swift <input> <output.jpg>") }
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])

guard let source = CGImageSourceCreateWithURL(input as CFURL, nil) else {
  fail("can't open \(args[1]) as an image")
}

// The stored size, to make sure we only ever shrink
let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] ?? [:]
let width = props[kCGImagePropertyPixelWidth] as? Int ?? LONG_SIDE
let height = props[kCGImagePropertyPixelHeight] as? Int ?? LONG_SIDE
let longSide = min(LONG_SIDE, max(width, height))

let options: [CFString: Any] = [
  kCGImageSourceCreateThumbnailFromImageAlways: true,
  kCGImageSourceCreateThumbnailWithTransform: true,   // apply the rotation note
  kCGImageSourceThumbnailMaxPixelSize: longSide,
]
guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
  fail("couldn't read the pixels of \(args[1])")
}

guard let destination = CGImageDestinationCreateWithURL(
  output as CFURL, UTType.jpeg.identifier as CFString, 1, nil
) else { fail("can't write \(args[2])") }

// Only the compression setting goes in. No properties from the original are copied.
CGImageDestinationAddImage(destination, image,
  [kCGImageDestinationLossyCompressionQuality: QUALITY] as CFDictionary)
guard CGImageDestinationFinalize(destination) else { fail("writing \(args[2]) failed") }
