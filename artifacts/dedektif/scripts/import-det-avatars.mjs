#!/usr/bin/env node
/**
 * One-shot import: copies 30 dedektif player avatars from Cursor assets → player_avatars/
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ASSETS =
  "C:/Users/msi-nb/.cursor/projects/c-Users-msi-nb-OneDrive-Masa-st-Faili-Mechul/assets";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST = path.join(__dirname, "../assets/images/player_avatars");

const MANIFEST = [
  { ts: "224005.461", key: "av_maskeli", label: "Maskeli Kadın" },
  { ts: "224018.596", key: "av_puro", label: "Puro Dedektif" },
  { ts: "224021.769", key: "av_beyazceket", label: "Beyaz Ceket" },
  { ts: "224022.476", key: "av_kulaklik", label: "Kulaklıklı Dedektif" },
  { ts: "224024.447", key: "av_telsiz", label: "Telsizli Genç" },
  { ts: "224032.760", key: "av_grikazak", label: "Gri Kazaklı" },
  { ts: "224033.799", key: "av_yarali", label: "Yaralı Dedektif" },
  { ts: "224040.627", key: "av_savasci", label: "Savaşçı Kadın" },
  { ts: "224041.746", key: "av_kirmiziyelek", label: "Kırmızı Yelek" },
  { ts: "224047.637", key: "av_pembe", label: "Pembe Gözlük" },
  { ts: "224054.132", key: "av_auburn", label: "Auburn Gözlüklü" },
  { ts: "224057.015", key: "av_gulumse", label: "Gülümseyen" },
  { ts: "224100.961", key: "av_siyahceket", label: "Siyah Ceket" },
  { ts: "224112.531", key: "av_mavipolis", label: "Mavi Polis" },
  { ts: "224115.621", key: "av_motor", label: "Motorcu" },
  { ts: "224119.682", key: "av_copkur", label: "Kop Surat" },
  { ts: "224122.715", key: "av_flanel", label: "Flanel Gömlek" },
  { ts: "224122.832", key: "av_eldiven", label: "Eldivenli Kadın" },
  { ts: "224130.044", key: "av_halka", label: "Halkalı Kadın" },
  { ts: "224133.133", key: "av_taktikkadin", label: "Taktik Kadın" },
  { ts: "224133.976", key: "av_helmet", label: "Kasklı Operatör" },
  { ts: "224141.423", key: "av_sarigoz", label: "Sarı Gözlü" },
  { ts: "224145.756", key: "av_forensik", label: "Forensik Uzman" },
  { ts: "224149.420", key: "av_flas", label: "Flaşlı Dedektif" },
  { ts: "224343.626", key: "av_trench", label: "Trençkotlu" },
  { ts: "224422.471", key: "av_sakal", label: "Sakallı Dedektif" },
  { ts: "224553.344", key: "av_kanli", label: "Kanlı Yelek" },
  { ts: "224557.393", key: "av_noir", label: "Noir Dedektif" },
  { ts: "224558.039", key: "av_yara", label: "Bandajlı Kadın" },
  { ts: "224634.910", key: "av_monokl", label: "Monokl Bey" },
];

function md5(p) {
  return crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
}

const all = fs.readdirSync(ASSETS);
const existingHashes = new Set(
  fs
    .readdirSync(DEST)
    .filter((f) => f.startsWith("av_") && f.endsWith(".png"))
    .map((f) => md5(path.join(DEST, f))),
);

const seen = new Set();
for (const { ts, key } of MANIFEST) {
  const src = all.find((f) => f.includes(`T${ts}`));
  if (!src) throw new Error(`Missing source for ${ts} (${key})`);
  const srcPath = path.join(ASSETS, src);
  const h = md5(srcPath);
  if (seen.has(h)) throw new Error(`Duplicate among new batch: ${key}`);
  if (existingHashes.has(h)) throw new Error(`Duplicate of existing avatar: ${key}`);
  seen.add(h);
  const out = path.join(DEST, `${key}.png`);
  fs.copyFileSync(srcPath, out);
  console.log(`✓ ${key}.png`);
}

console.log(`\nImported ${MANIFEST.length} avatars.`);
