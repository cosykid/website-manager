import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafeAddress } from "@/library/validate";
import { imageAddress, imageIdFromFileName, readImageType } from "./image-file";

/** A file's bytes, from text with one character for each byte. */
function bytesOf(text: string): Uint8Array {
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

test("readImageType tells each kind of image by how its file starts", () => {
  assert.equal(readImageType(bytesOf("\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01")), "image/jpeg");
  assert.equal(readImageType(bytesOf("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")), "image/png");
  assert.equal(readImageType(bytesOf("GIF89a\x01\x00\x01\x00")), "image/gif");
  assert.equal(readImageType(bytesOf("GIF87a\x01\x00\x01\x00")), "image/gif");
  assert.equal(readImageType(bytesOf("RIFF\x24\x00\x00\x00WEBPVP8 ")), "image/webp");
});

test("readImageType refuses everything else", () => {
  // The first two are what a page that runs scripts would be uploaded as.
  assert.equal(readImageType(bytesOf("<!doctype html><script>")), null);
  assert.equal(readImageType(bytesOf('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(readImageType(bytesOf("%PDF-1.7")), null);
  // A sound file, which starts as WebP does.
  assert.equal(readImageType(bytesOf("RIFF\x24\x00\x00\x00WAVEfmt ")), null);
  // Cut off before it is clear.
  assert.equal(readImageType(bytesOf("\xff\xd8")), null);
  assert.equal(readImageType(bytesOf("RIFF")), null);
  assert.equal(readImageType(bytesOf("")), null);
});

test("an image's address gives back its id, and is one a page can store", () => {
  const id = "9f86d081884c7d659a2feaa0c55ad015";
  const address = imageAddress(id, "image/jpeg");

  assert.equal(address, `/images/${id}.jpg`);
  assert.equal(imageIdFromFileName(address.replace("/images/", "")), id);
  assert.equal(isSafeAddress(address), true);
});

test("imageIdFromFileName refuses a name no image has", () => {
  assert.equal(imageIdFromFileName("photo.jpg"), null);
  assert.equal(imageIdFromFileName("9f86d081884c7d659a2feaa0c55ad015"), null);
  assert.equal(imageIdFromFileName("9F86D081884C7D659A2FEAA0C55AD015.jpg"), null);
  assert.equal(imageIdFromFileName("../9f86d081884c7d659a2feaa0c55ad015.jpg"), null);
  assert.equal(imageIdFromFileName(""), null);
});
