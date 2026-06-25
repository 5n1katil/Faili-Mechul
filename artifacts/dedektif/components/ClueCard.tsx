import React, { useState, useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Audio } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { useGame } from "@/context/GameContext";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type {
  Clue,
  ClueAnagramData,
  ClueDnaVerisi,
  ClueFotoVerisi,
  CluePhoneVerisi,
  ClueParmakIziVerisi,
  ClueSifre,
  ClueTimelineVerisi,
  ClueYuzlesmeDialog,
} from "@/data/puzzles";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const AUDIO_ASSETS: Record<string, ReturnType<typeof require>> = {
  audio_ott_004_c6_rihtim_nobet_silindiri: require("../assets/audio/cases/ott_004/ott_004_c6_rihtim_nobet_silindiri.mp3"),
  audio_hw_001_c3_kulaklik_fisilti: require("../assets/audio/cases/hw_001/hw_001_c3_kulaklik_fisilti.mp3"),
  audio_hw_004_c5_acil_interkom: require("../assets/audio/cases/hw_004/hw_004_c5_acil_interkom.mp3"),
  audio_sf_003_c2_a3_tarama_kaydi: require("../assets/audio/cases/sf_003/sf_003_c2_a3_tarama_kaydi.mp3"),
  rc_002_c3_dahili_hat: require("../assets/audio/cases/rc_002/rc_002_c3_dahili_hat.mp3"),
};

const FINGERPRINT_IMAGES: Record<string, ReturnType<typeof require>> = {
  fp_whorl: require("../assets/images/fingerprints/fp_whorl.png"),
  fp_loop_right: require("../assets/images/fingerprints/fp_loop_right.png"),
  fp_loop_left: require("../assets/images/fingerprints/fp_loop_left.png"),
  fp_arch: require("../assets/images/fingerprints/fp_arch.png"),
  fp_tented_arch: require("../assets/images/fingerprints/fp_tented_arch.png"),
  fp_double_loop: require("../assets/images/fingerprints/fp_double_loop.png"),
  fp_central_pocket: require("../assets/images/fingerprints/fp_central_pocket.png"),
  fp_lateral_pocket: require("../assets/images/fingerprints/fp_lateral_pocket.png"),
  fp_accidental: require("../assets/images/fingerprints/fp_accidental.png"),
  fp_peacock: require("../assets/images/fingerprints/fp_peacock.png"),
};

interface Props {
  clue: Clue;
  index: number;
  isRevealed: boolean;
  isBonus?: boolean;
  isSolved?: boolean;
  onRevealBonus?: () => void;
  onSolveMechanic?: () => void;
}

const CLUE_META: Record<
  Clue["type"],
  {
    icon: MaterialIconName;
    color: string;
    label: string;
    cardTint: string;
    borderStyle: "solid" | "dashed" | "dotted";
  }
> = {
  direct: {
    icon: "search",
    color: "#D4A843",
    label: "Doğrudan",
    cardTint: "#D4A84308",
    borderStyle: "solid",
  },
  indirect: {
    icon: "lightbulb-outline",
    color: "#f59e0b",
    label: "Dolaylı",
    cardTint: "#f59e0b08",
    borderStyle: "solid",
  },
  elimination: {
    icon: "block",
    color: "#C8372D",
    label: "Eleme",
    cardTint: "#C8372D0D",
    borderStyle: "solid",
  },
  evidence: {
    icon: "fingerprint",
    color: "#9333ea",
    label: "Kanıt",
    cardTint: "#9333ea14",
    borderStyle: "dashed",
  },
  witness: {
    icon: "record-voice-over",
    color: "#3b82f6",
    label: "Tanık",
    cardTint: "#3b82f610",
    borderStyle: "solid",
  },
  forensic: {
    icon: "biotech",
    color: "#14b8a6",
    label: "Adli",
    cardTint: "#14b8a610",
    borderStyle: "dotted",
  },
};

function DeductionHint({ hint }: { hint: string }) {
  return (
    <View style={styles.deductionHint}>
      <MaterialIcons name="lightbulb" size={12} color="#D4A843" />
      <Text style={styles.deductionHintText}>{hint}</Text>
    </View>
  );
}

function GorselIpucuBlock({ aciklama }: { aciklama: string }) {
  return (
    <View style={styles.gorselBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="image-search" size={14} color="#D4A843" />
        <Text style={styles.gorselLabel}>KANIT DELİLİ</Text>
      </View>
      <Text style={styles.gorselText}>{aciklama}</Text>
    </View>
  );
}

function TelephoneSwitchboardBlock({
  clue,
  isSolved,
  onSolve,
}: {
  clue: Clue;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const puzzle = clue.audioPuzzle!;
  const segments = puzzle.segments ?? [];
  const options = puzzle.options ?? [];

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [activeSegId, setActiveSegId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const stopAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { sound?.unloadAsync(); };
  }, [sound]);

  const playSegment = async (seg: { id: string; startSec: number; endSec: number }) => {
    try {
      if (sound) { await sound.unloadAsync(); setSound(null); }
      setActiveSegId(seg.id);
      stopAtMsRef.current = seg.endSec * 1000;
      const assetSource = clue.audioAssetId ? AUDIO_ASSETS[clue.audioAssetId] as import("expo-av").AVPlaybackSource : null;
      if (!assetSource) return;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync(
        assetSource,
        { shouldPlay: false, positionMillis: seg.startSec * 1000 },
        (status) => {
          if (status.isLoaded) {
            const stopAt = stopAtMsRef.current;
            if (stopAt !== null && status.positionMillis >= stopAt) {
              newSound.pauseAsync();
              stopAtMsRef.current = null;
              setActiveSegId(null);
            }
            if (status.didJustFinish) { setActiveSegId(null); }
          }
        }
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch { setActiveSegId(null); }
  };

  const stopPlayback = async () => {
    if (sound) { await sound.pauseAsync(); }
    setActiveSegId(null);
    stopAtMsRef.current = null;
  };

  const chooseOption = (optionId: string) => {
    if (isSolved) return;
    setSelectedId(optionId);
    if (optionId === puzzle.correctOptionId) {
      onSolve();
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 2500);
    }
  };

  const handleHint = () => {
    if (hintRevealed) return;
    setHintRevealed(true);
    addTimePenalty(puzzle.hintPenaltySeconds ?? 60);
  };

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>{puzzle.successMessage ?? "Hat tespit edildi."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.switchboardBlock}>
      <View style={styles.switchboardTitleBar}>
        <MaterialIcons name="phone" size={13} color="#e0b54e" />
        <Text style={styles.switchboardTitleText}>{(puzzle.title ?? "DAHİLİ HAT DÜZENİ").toLocaleUpperCase("tr-TR")}</Text>
      </View>
      {puzzle.subtitle ? <Text style={styles.switchboardSubtitle}>{puzzle.subtitle}</Text> : null}
      {puzzle.purposeHint ? (
        <View style={styles.switchboardPurpose}>
          <Text style={styles.switchboardPurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.switchboardPurposeText}>{puzzle.purposeHint}</Text>
        </View>
      ) : null}

      <Text style={styles.switchboardSectionLabel}>MAKARADAN KESİT DİNLE</Text>
      <View style={styles.switchboardSegments}>
        {segments.map((seg) => {
          const isActive = activeSegId === seg.id;
          return (
            <Pressable
              key={seg.id}
              style={[styles.switchboardSegBtn, isActive && styles.switchboardSegBtnActive]}
              onPress={() => isActive ? stopPlayback() : playSegment(seg)}
            >
              <MaterialIcons
                name={isActive ? "pause" : "play-arrow"}
                size={16}
                color={isActive ? "#e0b54e" : "#8b91ad"}
              />
              <Text style={[styles.switchboardSegBtnText, isActive && { color: "#e0b54e" }]}>
                {seg.label ?? seg.id}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.switchboardQuestion}>{puzzle.question ?? "Doğru hattı seç."}</Text>
      <View style={styles.switchboardOptions}>
        {options.map((opt) => {
          const isSel = selectedId === opt.id;
          const isCorrect = isSel && opt.id === puzzle.correctOptionId;
          const isWrong = isSel && !isCorrect;
          return (
            <Pressable
              key={opt.id}
              style={[styles.switchboardOptionBtn, isCorrect && styles.switchboardOptionCorrect, isWrong && styles.switchboardOptionWrong]}
              onPress={() => chooseOption(opt.id)}
            >
              <Text style={[styles.switchboardOptionText, isCorrect && { color: "#86efac" }, isWrong && { color: "#fca5a5" }]}>
                {opt.label ?? opt.id}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {wrong && (
        <Text style={styles.switchboardWrong}>{puzzle.failureMessage ?? "Cızırtının altındaki ayrıntıları yeniden dinle."}</Text>
      )}

      {puzzle.hint ? (
        hintRevealed ? (
          <>
            <View style={styles.sifreHintRevealed}>
              <MaterialIcons name="warning" size={12} color="#f59e0b" />
              <Text style={[styles.sifreHintRevealedLabel, { color: "#f59e0b" }]}>İpucu açıldı (ceza uygulandı)</Text>
            </View>
            <View style={[styles.sifreIpucu, { marginHorizontal: 12 }]}>
              <Text style={styles.sifreIpucuText}>{puzzle.hint}</Text>
            </View>
          </>
        ) : (
          <Pressable style={[styles.sifreHintBtn, { marginHorizontal: 12 }]} onPress={handleHint}>
            <MaterialIcons name="lightbulb-outline" size={14} color="#e0b54e" />
            <Text style={[styles.sifreHintBtnText, { color: "#e0b54e" }]}>İpucu İste (−{puzzle.hintPenaltySeconds ?? 60} sn / ceza puanı)</Text>
          </Pressable>
        )
      ) : null}

      {clue.sesMetni ? (
        <>
          <Pressable style={styles.switchboardTranscriptBtn} onPress={() => setTranscriptOpen(v => !v)}>
            <MaterialIcons name={transcriptOpen ? "expand-less" : "expand-more"} size={14} color="#8b91ad" />
            <Text style={styles.switchboardTranscriptBtnText}>
              {transcriptOpen ? "Kayıt çözümlemesini gizle" : "Kayıt çözümlemesini göster"}
            </Text>
          </Pressable>
          {transcriptOpen ? (
            <View style={styles.switchboardTranscript}>
              <Text style={styles.switchboardTranscriptText}>{clue.sesMetni}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function SesKaydiBlock({ audioAssetId }: { audioAssetId?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const assetSource = audioAssetId ? AUDIO_ASSETS[audioAssetId] as import("expo-av").AVPlaybackSource : null;

  const handlePlayPause = async () => {
    if (!assetSource) return;
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }
      setIsLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        assetSource,
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.durationMillis && status.durationMillis > 0) {
              setProgress(status.positionMillis / status.durationMillis);
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setProgress(0);
            }
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.sesBlock}>
      <View style={styles.sesHeader}>
        <MaterialIcons name="mic" size={14} color="#3b82f6" />
        <Text style={styles.sesLabel}>SES KAYDI</Text>
        <View style={styles.sesBadge}>
          <View style={[styles.sesDot, isPlaying && styles.sesDotActive]} />
          <Text style={styles.sesRec}>{isPlaying ? "LIVE" : "REC"}</Text>
        </View>
      </View>
      <View style={styles.sesPlayerRow}>
        <Pressable
          onPress={handlePlayPause}
          style={[styles.sesPlayBtn, !assetSource && styles.sesPlayBtnDisabled]}
          disabled={isLoading || !assetSource}
        >
          <MaterialIcons
            name={isLoading ? "hourglass-empty" : isPlaying ? "pause" : "play-arrow"}
            size={26}
            color="#fff"
          />
        </Pressable>
        <View style={styles.sesProgressBar}>
          <View style={[styles.sesProgressFill, { width: `${progress * 100}%` as any }]} />
        </View>
      </View>
    </View>
  );
}

function TanikYuzlesmeBlock({ dialoglar }: { dialoglar: ClueYuzlesmeDialog[] }) {
  return (
    <View style={styles.yuzlesmeBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="question-answer" size={14} color="#f59e0b" />
        <Text style={[styles.gorselLabel, { color: "#f59e0b" }]}>TANIK YÜZLEŞMESİ</Text>
      </View>
      {dialoglar.map((d, i) => (
        <View key={i} style={styles.yuzlesmeRow}>
          <View style={styles.soruBubble}>
            <Text style={styles.soruLabel}>S:</Text>
            <Text style={styles.soruText}>{d.soru}</Text>
          </View>
          <View style={[styles.cevapBubble, d.yalan && styles.cevapBubbleYalan]}>
            <Text style={styles.cevapLabel}>C:</Text>
            <Text style={[styles.cevapText, d.yalan && styles.cevapTextYalan]}>{d.cevap}</Text>
            {d.yalan && (
              <View style={styles.yalanBadge}>
                <MaterialIcons name="warning" size={10} color="#C8372D" />
                <Text style={styles.yalanText}>ÇELİŞKİ</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function SymbolCrossgridBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const pres = sifre.presentation!;
  const rowSymbols = pres.rowSymbols ?? [];
  const colSymbols = pres.columnSymbols ?? [];
  const cells = pres.cells ?? [];
  const cipherSyms = (pres.cipherSymbols ?? []) as string[];
  const answerAliases = (pres.answerAliases ?? []) as string[];
  const interaction = pres.interaction ?? {};

  const [blockWidth, setBlockWidth] = useState(0);
  const TOTAL_COLS = colSymbols.length + 1;
  // blockWidth is the crossgridBlock outer width; grid has marginH:12 + border:1 each side
  const CELL = blockWidth > 0
    ? Math.max(22, Math.floor((blockWidth - 26) / TOTAL_COLS))
    : 30;
  const symFont = Math.max(8, Math.floor(CELL * 0.36));
  const letterFont = Math.max(8, Math.floor(CELL * 0.38));

  const [chipIndices, setChipIndices] = useState<(number | null)[]>(
    cipherSyms.map(() => null)
  );
  const [wrong, setWrong] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);

  const getColLetters = (sym: string): string[] => {
    const ci = colSymbols.indexOf(sym);
    if (ci < 0) return [];
    return rowSymbols.map((_, ri) => cells[ri]?.[ci] ?? "?");
  };

  const tapChip = (i: number, sym: string) => {
    if (sym === "/") return;
    const letters = getColLetters(sym);
    if (letters.length === 0) return;
    setChipIndices(prev => {
      const next = [...prev];
      const cur = next[i];
      next[i] = cur === null ? 0 : cur < letters.length - 1 ? cur + 1 : null;
      return next;
    });
    setWrong(false);
  };

  const buildAnswer = () =>
    cipherSyms.map((sym, i) => {
      if (sym === "/") return " / ";
      const idx = chipIndices[i];
      if (idx === null) return "?";
      return getColLetters(sym)[idx] ?? "?";
    }).join("");

  const allFilled = cipherSyms.every((sym, i) => sym === "/" || chipIndices[i] !== null);

  const normalize = (s: string) =>
    s.trim().toLocaleUpperCase("tr-TR").replace(/İ/g, "I").replace(/\s+/g, " ");

  const checkAnswer = () => {
    if (!allFilled) {
      setWrong(true);
      setTimeout(() => setWrong(false), 2200);
      return;
    }
    const answer = buildAnswer();
    const norm = normalize(answer);
    const valid = [sifre.cozulmus, ...answerAliases].map(normalize);
    if (valid.includes(norm)) {
      onSolve();
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 2200);
    }
  };

  const handleHint = () => {
    if (hintRevealed) return;
    setHintRevealed(true);
    addTimePenalty(60);
  };

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Şifre Çözüldü!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{sifre.cozulmus}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.crossgridBlock}
      onLayout={(e) => setBlockWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.crossgridTitleBar}>
        <MaterialIcons name="grid-on" size={13} color="#e0b54e" />
        <Text style={styles.crossgridTitleText}>{pres.title ?? "EŞLEME TAHTASI"}</Text>
      </View>
      {pres.subtitle ? <Text style={styles.crossgridSubtitle}>{pres.subtitle as string}</Text> : null}
      {pres.purposeHint ? (
        <View style={styles.crossgridPurpose}>
          <Text style={styles.crossgridPurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.crossgridPurposeText}>{pres.purposeHint as string}</Text>
        </View>
      ) : null}

      {/* Grid — sized precisely from measured block width */}
      {blockWidth > 0 ? (
        <View style={[styles.crossgridScroll, { marginHorizontal: 12 }]}>
          <View style={styles.crossgridRow}>
            <View style={[styles.crossgridCell, styles.crossgridCorner, { width: CELL, height: CELL }]}>
              <Text style={[styles.crossgridCornerText, { fontSize: symFont }]}>↘</Text>
            </View>
            {colSymbols.map((sym, ci) => (
              <View key={ci} style={[styles.crossgridCell, styles.crossgridColHeader, { width: CELL, height: CELL }]}>
                <Text style={[styles.crossgridHeaderText, { fontSize: symFont }]}>{sym}</Text>
              </View>
            ))}
          </View>
          {rowSymbols.map((rowSym, ri) => (
            <View key={ri} style={styles.crossgridRow}>
              <View style={[styles.crossgridCell, styles.crossgridRowHeader, { width: CELL, height: CELL }]}>
                <Text style={[styles.crossgridHeaderText, { fontSize: symFont }]}>{rowSym}</Text>
              </View>
              {(cells[ri] ?? []).map((letter, ci) => (
                <View key={ci} style={[styles.crossgridCell, styles.crossgridDataCell, { width: CELL, height: CELL }]}>
                  <Text style={[styles.crossgridCellText, { fontSize: letterFont }]}>{letter}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {/* Interactive cipher chips — flexWrap so they flow into 2 rows naturally */}
      <View style={styles.crossgridCipherSection}>
        <Text style={styles.crossgridCipherLabel}>ŞİFRE — Sembole tıkla, harfi bul</Text>
        <View style={styles.crossgridChipsRow}>
          {cipherSyms.map((sym, i) => {
            if (sym === "/") {
              return (
                <View key={i} style={styles.crossgridChipSep}>
                  <Text style={styles.crossgridChipSepText}>/</Text>
                </View>
              );
            }
            const idx = chipIndices[i];
            const letters = getColLetters(sym);
            const currentLetter = idx !== null ? (letters[idx] ?? "?") : null;
            const isSet = idx !== null;
            return (
              <Pressable
                key={i}
                style={[styles.crossgridChip, isSet && styles.crossgridChipActive]}
                onPress={() => tapChip(i, sym)}
              >
                <Text style={[styles.crossgridChipSymbol, isSet && { color: "#e0b54e" }]}>{sym}</Text>
                <Text style={[styles.crossgridChipLetter, isSet && styles.crossgridChipLetterActive]}>
                  {isSet ? currentLetter : "?"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {/* Live answer preview */}
        <View style={styles.crossgridAnswerPreview}>
          <Text style={[styles.crossgridAnswerPreviewText, wrong && { color: "#ef4444" }]}>
            {buildAnswer()}
          </Text>
        </View>
      </View>

      {hintRevealed ? (
        <View style={styles.sifreHintRevealed}>
          <MaterialIcons name="warning" size={12} color="#f59e0b" />
          <Text style={[styles.sifreHintRevealedLabel, { color: "#f59e0b" }]}>İpucu açıldı (ceza uygulandı)</Text>
        </View>
      ) : null}
      {hintRevealed ? (
        <View style={[styles.sifreIpucu, { marginHorizontal: 12 }]}>
          <Text style={styles.sifreIpucuText}>{sifre.cozumIpucu}</Text>
        </View>
      ) : (
        <Pressable style={[styles.sifreHintBtn, { marginHorizontal: 12 }]} onPress={handleHint}>
          <MaterialIcons name="lightbulb-outline" size={14} color="#e0b54e" />
          <Text style={[styles.sifreHintBtnText, { color: "#e0b54e" }]}>İpucu İste (-60 sn / ceza puanı)</Text>
        </Pressable>
      )}

      {wrong && (
        <Text style={[styles.anagramWrong, { marginHorizontal: 12 }]}>
          {!allFilled
            ? "Tüm sembolleri çöz — eksik harf var"
            : (interaction.failureMessage ?? "Yanlış — sembolleri tekrar dene")}
        </Text>
      )}
      <Pressable
        style={[styles.crossgridSubmitBtn, !allFilled && { opacity: 0.5 }]}
        onPress={checkAnswer}
      >
        <MaterialIcons name="search" size={15} color="#1a1205" />
        <Text style={styles.crossgridSubmitText}>{interaction.submitLabel ?? "Şifreyi Çöz"}</Text>
      </Pressable>
    </View>
  );
}

function ThermalSequenceBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const cards = sifre.presentation!.cards!;
  const [order, setOrder] = useState<number[]>(cards.map((_, i) => i));
  const [selected, setSelected] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [glyphsRevealed, setGlyphsRevealed] = useState(false);

  const sortedIndices = [...cards.map((_, i) => i)].sort(
    (a, b) => cards[a].temperatureC - cards[b].temperatureC
  );

  const handleCardPress = (pos: number) => {
    if (glyphsRevealed) return;
    if (selected === null) {
      setSelected(pos);
    } else if (selected === pos) {
      setSelected(null);
    } else {
      const newOrder = [...order];
      [newOrder[selected], newOrder[pos]] = [newOrder[pos], newOrder[selected]];
      setOrder(newOrder);
      setSelected(null);
      setWrong(false);
    }
  };

  const checkOrder = () => {
    const isCorrect = order.every((cardIdx, pos) => cardIdx === sortedIndices[pos]);
    if (isCorrect) {
      setGlyphsRevealed(true);
      setTimeout(() => onSolve(), 1400);
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 2000);
    }
  };

  const handleHint = () => {
    if (hintRevealed) return;
    setHintRevealed(true);
    addTimePenalty(60);
  };

  if (isSolved) {
    const solvedGlyphs = sortedIndices.map((ci) => cards[ci].glyph).join("");
    const word1 = solvedGlyphs.slice(0, 5);
    const word2 = solvedGlyphs.slice(5);
    return (
      <View style={styles.thermalSolvedBlock}>
        <View style={styles.thermalSolvedHeader}>
          <MaterialIcons name="check-circle" size={18} color="#22c55e" />
          <Text style={styles.thermalSolvedTitle}>Kriyo Bellek Çözüldü!</Text>
        </View>
        <View style={styles.thermalSolvedGlyphs}>
          <View style={styles.thermalGlyphWord}>
            {word1.split("").map((g, i) => (
              <View key={i} style={styles.thermalGlyphChip}>
                <Text style={styles.thermalGlyphChipText}>{g}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.thermalGlyphSep}> </Text>
          <View style={styles.thermalGlyphWord}>
            {word2.split("").map((g, i) => (
              <View key={i} style={styles.thermalGlyphChip}>
                <Text style={styles.thermalGlyphChipText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{sifre.cozulmus}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  return (
    <View style={styles.thermalBlock}>
      <View style={styles.thermalTitleBar}>
        <View style={[styles.terminalDot, { backgroundColor: "#0ea5e9" }]} />
        <View style={[styles.terminalDot, { backgroundColor: "#38bdf8" }]} />
        <View style={[styles.terminalDot, { backgroundColor: "#7dd3fc" }]} />
        <Text style={styles.thermalTitleText}>KRİYO BELLEK // TERMAL SIRALAMA</Text>
      </View>
      <Text style={styles.thermalInstruction}>
        Parçaları <Text style={styles.thermalAccent}>en soğuktan en sıcağa</Text> sırala — doğru dizide gizli kimlik ortaya çıkar.
      </Text>
      <View style={styles.thermalCardList}>
        {order.map((cardIdx, pos) => {
          const card = cards[cardIdx];
          const isSelected = selected === pos;
          const isSwapTarget = selected !== null && selected !== pos;
          return (
            <Pressable
              key={pos}
              style={[
                styles.thermalCard,
                isSelected && styles.thermalCardSelected,
                wrong && styles.thermalCardWrong,
              ]}
              onPress={() => handleCardPress(pos)}
            >
              <View style={styles.thermalCardPos}>
                <Text style={[styles.thermalCardPosText, isSelected && { color: "#38bdf8" }]}>
                  {pos + 1}
                </Text>
              </View>
              <View style={styles.thermalCardCenter}>
                <Text style={[styles.thermalCardTemp, isSelected && { color: "#38bdf8" }]}>
                  {card.temperatureC.toFixed(1)}°C
                </Text>
                <Text style={styles.thermalCardNote} numberOfLines={1}>{card.note}</Text>
              </View>
              <View style={styles.thermalCardRight}>
                <Text style={styles.thermalCardId}>{card.id}</Text>
                <View style={[styles.thermalGlyphLock, glyphsRevealed && styles.thermalGlyphUnlocked]}>
                  <Text style={[styles.thermalGlyphLockText, glyphsRevealed && styles.thermalGlyphUnlockedText]}>
                    {glyphsRevealed ? card.glyph : "?"}
                  </Text>
                </View>
              </View>
              {isSelected && (
                <View style={styles.thermalCardSwapHint}>
                  <MaterialIcons name="swap-vert" size={12} color="#38bdf8" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {wrong && (
        <View style={styles.thermalErrorRow}>
          <MaterialIcons name="error-outline" size={13} color="#ef4444" />
          <Text style={styles.thermalErrorText}>Sıralama yanlış — dizi kriyo kurala uymadı</Text>
        </View>
      )}

      {hintRevealed ? (
        <View style={styles.sifreHintRevealed}>
          <MaterialIcons name="warning" size={12} color="#f59e0b" />
          <Text style={[styles.sifreHintRevealedLabel, { color: "#f59e0b" }]}>İpucu açıldı (ceza uygulandı)</Text>
        </View>
      ) : null}
      {hintRevealed ? (
        <View style={styles.sifreIpucu}>
          <Text style={styles.sifreIpucuText}>{sifre.cozumIpucu}</Text>
        </View>
      ) : (
        <Pressable style={styles.sifreHintBtn} onPress={handleHint}>
          <MaterialIcons name="lightbulb-outline" size={14} color="#0ea5e9" />
          <Text style={[styles.sifreHintBtnText, { color: "#0ea5e9" }]}>İpucu İste (-60 sn / ceza puanı)</Text>
        </Pressable>
      )}

      <Pressable style={styles.thermalSubmitBtn} onPress={checkOrder}>
        <MaterialIcons name="done-all" size={15} color="#0F1117" />
        <Text style={styles.thermalSubmitText}>Kriyo Sırayı Doğrula</Text>
      </Pressable>
    </View>
  );
}

function SifreliMesajBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const [input, setInput] = useState("");
  const [hintRevealed, setHintRevealed] = useState(false);
  const [tried, setTried] = useState(false);
  const [komutSecimler, setKomutSecimler] = useState<Record<number, string>>({});
  const [komutWrong, setKomutWrong] = useState(false);

  const handleHint = () => {
    if (hintRevealed) return;
    setHintRevealed(true);
    addTimePenalty(60);
  };

  const checkAnswer = () => {
    const normalize = (s: string) =>
      s.trim().toLocaleUpperCase("tr-TR").replace(/İ/g, "I").replace(/\s+/g, " ");
    if (normalize(input) === normalize(sifre.cozulmus)) {
      onSolve();
      setTried(false);
    } else {
      setTried(true);
    }
  };

  const checkKomut = () => {
    const alanlar = sifre.komutAlanlari!;
    const allCorrect = alanlar.every((alan, i) => {
      const normalize = (s: string) =>
        s.trim().toLocaleUpperCase("tr-TR").replace(/İ/g, "I");
      return normalize(komutSecimler[i] ?? "") === normalize(alan.cevap);
    });
    if (allCorrect) {
      onSolve();
    } else {
      setKomutWrong(true);
      setTimeout(() => setKomutWrong(false), 2000);
    }
  };

  if (sifre.presentation?.style === "symbol_crossgrid") {
    return <SymbolCrossgridBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.mode === "thermal_sequence") {
    return <ThermalSequenceBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Şifre Çözüldü!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{sifre.cozulmus}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  if (sifre.komutAlanlari && sifre.komutAlanlari.length > 0) {
    const allSelected = sifre.komutAlanlari.every((_, i) => !!komutSecimler[i]);
    return (
      <View style={styles.terminalBlock}>
        <View style={styles.terminalTitleBar}>
          <View style={styles.terminalDot} />
          <View style={[styles.terminalDot, { backgroundColor: "#f59e0b" }]} />
          <View style={[styles.terminalDot, { backgroundColor: "#22c55e" }]} />
          <Text style={styles.terminalTitleText}>OMEGA-7 // KOMUT KURTARMA</Text>
        </View>
        <Text style={styles.terminalContext}>{sifre.sifrelenmis}</Text>
        <View style={styles.terminalDivider} />
        {sifre.komutAlanlari.map((alan, i) => (
          <View key={i} style={styles.terminalField}>
            <Text style={styles.terminalFieldLabel}>{alan.etiket}</Text>
            <View style={styles.terminalOptions}>
              {alan.secenekler.map((opt) => {
                const isSelected = komutSecimler[i] === opt;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.terminalOption, isSelected && styles.terminalOptionSelected]}
                    onPress={() => setKomutSecimler((prev) => ({ ...prev, [i]: opt }))}
                  >
                    <Text style={[styles.terminalOptionText, isSelected && styles.terminalOptionTextSelected]}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <View style={styles.terminalDivider} />
        {hintRevealed ? (
          <View style={styles.sifreHintRevealed}>
            <MaterialIcons name="warning" size={12} color="#f59e0b" />
            <Text style={[styles.sifreHintRevealedLabel, { color: "#f59e0b" }]}>
              İpucu açıldı (ceza uygulandı)
            </Text>
          </View>
        ) : null}
        {hintRevealed ? (
          <View style={styles.sifreIpucu}>
            <Text style={styles.sifreIpucuText}>{sifre.cozumIpucu}</Text>
          </View>
        ) : (
          <Pressable style={styles.sifreHintBtn} onPress={handleHint}>
            <MaterialIcons name="lightbulb-outline" size={14} color="#9333ea" />
            <Text style={styles.sifreHintBtnText}>İpucu İste (-60 sn / ceza puanı)</Text>
          </Pressable>
        )}
        {komutWrong && (
          <Text style={styles.anagramWrong}>Seçimlerini kontrol et — en az bir alan yanlış</Text>
        )}
        <Pressable
          style={[styles.terminalSubmitBtn, !allSelected && styles.terminalSubmitBtnDisabled]}
          onPress={checkKomut}
          disabled={!allSelected}
        >
          <MaterialIcons name="terminal" size={14} color={allSelected ? "#0F1117" : "#555"} />
          <Text style={[styles.terminalSubmitText, !allSelected && { color: "#555" }]}>
            Komutları Doğrula
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.sifreBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="lock" size={14} color="#9333ea" />
        <Text style={[styles.gorselLabel, { color: "#9333ea" }]}>
          ŞİFRELİ MESAJ ({sifre.sifreleTuru})
        </Text>
      </View>
      <Text style={styles.sifreText}>{sifre.sifrelenmis}</Text>
      <View style={styles.sifreDivider} />

      {hintRevealed ? (
        <View style={styles.sifreHintRevealed}>
          <MaterialIcons name="warning" size={12} color="#f59e0b" />
          <Text style={[styles.sifreHintRevealedLabel, { color: "#f59e0b" }]}>
            İpucu açıldı (ceza uygulandı)
          </Text>
        </View>
      ) : null}

      {hintRevealed ? (
        <View style={styles.sifreIpucu}>
          <Text style={styles.sifreIpucuText}>
            İpucu: {sifre.cozumIpucu}
          </Text>
        </View>
      ) : (
        <Pressable style={styles.sifreHintBtn} onPress={handleHint}>
          <MaterialIcons name="lightbulb-outline" size={14} color="#9333ea" />
          <Text style={styles.sifreHintBtnText}>İpucu İste (-60 sn / ceza puanı)</Text>
        </Pressable>
      )}

      <TextInput
        style={[styles.sifreInput, tried && styles.anagramInputError]}
        value={input}
        onChangeText={(t) => { setInput(t); setTried(false); }}
        placeholder="Cevabını yaz..."
        placeholderTextColor="#555"
        autoCapitalize="characters"
        autoCorrect={false}
        onSubmitEditing={checkAnswer}
      />
      {tried && (
        <Text style={styles.anagramWrong}>Yanlış cevap — tekrar dene</Text>
      )}
      <Pressable style={styles.sifreCozBtn} onPress={checkAnswer}>
        <Text style={styles.sifreCozBtnText}>Şifreyi Çöz</Text>
      </Pressable>
    </View>
  );
}

function PhoneChainBlock({ phoneVerisi }: { phoneVerisi: CluePhoneVerisi }) {
  return (
    <View style={styles.phoneBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="phone-in-talk" size={14} color="#14b8a6" />
        <Text style={[styles.gorselLabel, { color: "#14b8a6" }]}>TELEFON ZİNCİRİ</Text>
      </View>
      <Text style={styles.phoneAciklama}>{phoneVerisi.aciklama}</Text>
      {phoneVerisi.mesajlar.map((m, i) => (
        <View key={m.id} style={styles.phoneCard}>
          <View style={styles.phoneCardTop}>
            <View style={styles.phoneFrom}>
              <MaterialIcons name="send" size={10} color="#14b8a6" />
              <Text style={styles.phoneFromText}>{m.gonderen}</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={12} color="#555" />
            <View style={styles.phoneTo}>
              <Text style={styles.phoneToText}>{m.alici}</Text>
            </View>
            <Text style={styles.phoneSaat}>{m.saat}</Text>
          </View>
          <Text style={styles.phoneIcerik}>"{m.icerik}"</Text>
          {i < phoneVerisi.mesajlar.length - 1 && (
            <View style={styles.phoneConnector}>
              <View style={styles.phoneConnectorLine} />
            </View>
          )}
        </View>
      ))}
      <View style={styles.phoneSonuc}>
        <MaterialIcons name="info-outline" size={12} color="#14b8a688" />
        <Text style={styles.phoneSonucText}>{phoneVerisi.sonuc}</Text>
      </View>
    </View>
  );
}

function AnagramBlock({
  anagramVerisi,
  isSolved,
  onSolve,
}: {
  anagramVerisi: ClueAnagramData;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const [input, setInput] = useState("");
  const [tried, setTried] = useState(false);

  const checkAnswer = () => {
    const normalized = input.trim().toLocaleUpperCase("tr-TR").replace(/İ/g, "I");
    const correct = anagramVerisi.dogru.toLocaleUpperCase("tr-TR").replace(/İ/g, "I");
    if (normalized === correct) {
      onSolve();
      setTried(false);
    } else {
      setTried(true);
    }
  };

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Anagram Çözüldü!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{anagramVerisi.dogru}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{anagramVerisi.aciklama}</Text>
      </View>
    );
  }

  return (
    <View style={styles.anagramBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="text-rotation-none" size={14} color="#f59e0b" />
        <Text style={[styles.gorselLabel, { color: "#f59e0b" }]}>ANAGRAM</Text>
      </View>
      <Text style={styles.anagramKarisik}>{anagramVerisi.karisik}</Text>
      <Text style={styles.anagramIpucu}>{anagramVerisi.ipucu}</Text>
      <View style={styles.anagramInputRow}>
        <TextInput
          style={[styles.anagramInput, tried && styles.anagramInputError]}
          value={input}
          onChangeText={(t) => { setInput(t); setTried(false); }}
          placeholder="Çözümü yaz..."
          placeholderTextColor="#555"
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={checkAnswer}
        />
        <Pressable style={styles.anagramBtn} onPress={checkAnswer}>
          <MaterialIcons name="check" size={18} color="#0F1117" />
        </Pressable>
      </View>
      {tried && <Text style={styles.anagramWrong}>Yanlış — tekrar dene</Text>}
    </View>
  );
}

function ParmakIziBlock({
  parmakIziVerisi,
  isSolved,
  onSolve,
}: {
  parmakIziVerisi: ClueParmakIziVerisi;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { gameState, addTimePenalty } = useGame();
  const suspects = gameState?.puzzle?.suspects ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(false);

  const scenePattern = parmakIziVerisi.sahneGorseli;
  const sceneImage = scenePattern ? FINGERPRINT_IMAGES[scenePattern] : null;
  const matchedSuspectId = scenePattern
    ? parmakIziVerisi.izler.find((iz) => iz.eslesme)?.eslesme ?? null
    : null;
  const matchedSuspect = matchedSuspectId
    ? suspects.find((s) => s.id === matchedSuspectId) ?? null
    : null;

  const handleSelect = (suspectId: string) => {
    if (isSolved) return;
    setSelected(suspectId);
    setWrongAttempt(false);
  };

  const handleConfirm = () => {
    if (!selected) return;
    if (scenePattern) {
      const suspect = suspects.find((s) => s.id === selected);
      const isCorrect = suspect?.parmakIziDeseni === scenePattern;
      if (isCorrect) {
        onSolve();
      } else {
        addTimePenalty(30);
        setWrongAttempt(true);
        setSelected(null);
      }
    } else {
      const iz = parmakIziVerisi.izler.find((i) => i.izId === selected);
      const sonuc = parmakIziVerisi.sonuc ?? "";
      if (iz && sonuc.includes(iz.eslesme)) {
        onSolve();
      } else {
        setWrongAttempt(true);
        setSelected(null);
      }
    }
  };

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Parmak İzi Eşleşti!</Text>
        {scenePattern && matchedSuspect && (
          <Text style={styles.fpMiniStory}>
            {"Yapılan detaylı incelemeler sonucunda kısmi parmak izinin "}
            <Text style={styles.fpMiniStoryBold}>{matchedSuspect.name}</Text>
            {"'a ait olduğu tespit edilmiştir."}
          </Text>
        )}
        <Text style={styles.miniGameAciklama}>{parmakIziVerisi.sonuc}</Text>
      </View>
    );
  }

  if (!scenePattern) {
    return (
      <View style={styles.parmakIziBlock}>
        <View style={styles.gorselHeader}>
          <MaterialIcons name="fingerprint" size={14} color="#f97316" />
          <Text style={[styles.gorselLabel, { color: "#f97316" }]}>PARMAK İZİ ANALİZİ</Text>
        </View>
        <Text style={styles.parmakIziAciklama}>{parmakIziVerisi.aciklama}</Text>
        <Text style={styles.parmakIziSelectLabel}>Kanıt izini seç:</Text>
        {parmakIziVerisi.izler.map((iz) => {
          const isSelected = selected === iz.izId;
          return (
            <Pressable
              key={iz.izId}
              onPress={() => handleSelect(iz.izId)}
              style={[styles.parmakIziCard, isSelected && styles.parmakIziCardSelected]}
            >
              <View style={styles.parmakIziCardHeader}>
                <MaterialIcons name="fingerprint" size={16} color={isSelected ? "#f97316" : "#64748b"} />
                <Text style={[styles.parmakIziKonum, isSelected && { color: "#f97316" }]}>{iz.konum}</Text>
              </View>
              <Text style={styles.parmakIziIpucu}>{iz.ipucu}</Text>
            </Pressable>
          );
        })}
        {wrongAttempt && <Text style={styles.parmakIziWrong}>Yanlış iz — tekrar dene</Text>}
        <Pressable
          onPress={handleConfirm}
          disabled={!selected}
          style={[styles.parmakIziConfirmBtn, !selected && styles.parmakIziConfirmBtnDisabled]}
        >
          <Text style={styles.parmakIziConfirmText}>Eşleşmeyi Onayla</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.parmakIziBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="fingerprint" size={14} color="#f97316" />
        <Text style={[styles.gorselLabel, { color: "#f97316" }]}>PARMAK İZİ ANALİZİ</Text>
      </View>
      <Text style={styles.parmakIziAciklama}>{parmakIziVerisi.aciklama}</Text>

      <View style={styles.fpSceneContainer}>
        <Text style={styles.fpSceneLabel}>Olay yerinden alınan kısmi parmak izi</Text>
        <View style={styles.fpSceneFrame}>
          {sceneImage ? (
            <Image source={sceneImage} style={styles.fpSceneImage} />
          ) : (
            <MaterialIcons name="fingerprint" size={72} color="#f9731650" />
          )}
        </View>
        <Text style={styles.fpSceneSubLabel}>Kısmi iz — laboruvar analizi</Text>
      </View>

      <Text style={styles.parmakIziSelectLabel}>Hangi şüpheliye ait?</Text>
      <View style={styles.fpSuspectGrid}>
        {suspects.map((suspect) => {
          const isSelected = selected === suspect.id;
          return (
            <Pressable
              key={suspect.id}
              onPress={() => handleSelect(suspect.id)}
              style={[styles.fpSuspectCard, isSelected && styles.fpSuspectCardSelected]}
            >
              <MaterialIcons
                name="person"
                size={20}
                color={isSelected ? "#f97316" : "#64748b"}
              />
              <Text style={[styles.fpSuspectName, isSelected && { color: "#f97316" }]} numberOfLines={2}>
                {suspect.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {wrongAttempt && (
        <Text style={styles.parmakIziWrong}>Yanlış eşleşme — 30 sn ceza uygulandı</Text>
      )}
      <Pressable
        onPress={handleConfirm}
        disabled={!selected}
        style={[styles.parmakIziConfirmBtn, !selected && styles.parmakIziConfirmBtnDisabled]}
      >
        <Text style={styles.parmakIziConfirmText}>Eşleşmeyi Onayla</Text>
      </Pressable>
    </View>
  );
}

function DnaMatchBlock({
  dnaVerisi,
  isSolved,
  onSolve,
}: {
  dnaVerisi: ClueDnaVerisi;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(false);

  const handleSelect = (suspectId: string) => {
    if (isSolved) return;
    setSelected(suspectId);
    setWrongAttempt(false);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const match = dnaVerisi.supheliProfiller.find((p) => p.suspectId === selected);
    if (match?.eslesme) {
      onSolve();
    } else {
      setWrongAttempt(true);
      setSelected(null);
    }
  };

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>DNA Eşleşmesi Bulundu!</Text>
        <Text style={styles.miniGameAciklama}>{dnaVerisi.sonuc}</Text>
      </View>
    );
  }

  return (
    <View style={styles.dnaBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="biotech" size={14} color="#14b8a6" />
        <Text style={[styles.gorselLabel, { color: "#14b8a6" }]}>DNA KARŞILAŞTIRMA</Text>
      </View>
      <Text style={styles.dnaAciklama}>{dnaVerisi.aciklama}</Text>
      <View style={styles.dnaOrnekCard}>
        <Text style={styles.dnaOrnekLabel}>ÖRNEK PROFİL</Text>
        <View style={styles.dnaLokusRow}>
          <View style={styles.dnaLokus}>
            <Text style={styles.dnaLokusKey}>L1</Text>
            <Text style={styles.dnaLokusVal}>{dnaVerisi.ornekProfil.lokus1}</Text>
          </View>
          <View style={styles.dnaLokus}>
            <Text style={styles.dnaLokusKey}>L2</Text>
            <Text style={styles.dnaLokusVal}>{dnaVerisi.ornekProfil.lokus2}</Text>
          </View>
          <View style={styles.dnaLokus}>
            <Text style={styles.dnaLokusKey}>L3</Text>
            <Text style={styles.dnaLokusVal}>{dnaVerisi.ornekProfil.lokus3}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.dnaSelectLabel}>Eşleşen kişiyi seç:</Text>
      {dnaVerisi.supheliProfiller.map((p) => {
        const isSelected = selected === p.suspectId;
        return (
          <Pressable
            key={p.suspectId}
            onPress={() => handleSelect(p.suspectId)}
            style={[
              styles.dnaCard,
              isSelected && styles.dnaCardSelected,
            ]}
          >
            <Text style={styles.dnaSuspectId}>{p.suspectId.toUpperCase()}</Text>
            <View style={styles.dnaLokusRow}>
              <View style={styles.dnaLokus}>
                <Text style={styles.dnaLokusKey}>L1</Text>
                <Text style={[styles.dnaLokusVal, p.lokus1 === dnaVerisi.ornekProfil.lokus1 && styles.dnaLokusMatch]}>
                  {p.lokus1}
                </Text>
              </View>
              <View style={styles.dnaLokus}>
                <Text style={styles.dnaLokusKey}>L2</Text>
                <Text style={[styles.dnaLokusVal, p.lokus2 === dnaVerisi.ornekProfil.lokus2 && styles.dnaLokusMatch]}>
                  {p.lokus2}
                </Text>
              </View>
              <View style={styles.dnaLokus}>
                <Text style={styles.dnaLokusKey}>L3</Text>
                <Text style={[styles.dnaLokusVal, p.lokus3 === dnaVerisi.ornekProfil.lokus3 && styles.dnaLokusMatch]}>
                  {p.lokus3}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
      <Pressable
        style={[styles.dnaConfirmBtn, !selected && styles.dnaConfirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!selected}
      >
        <Text style={styles.dnaConfirmText}>Onayla</Text>
      </Pressable>
      {wrongAttempt && <Text style={styles.dnaWrong}>Yanlış seçim — profilleri tekrar incele</Text>}
    </View>
  );
}

function FaceMatchBlock({
  fotoVerisi,
  isSolved,
  onSolve,
}: {
  fotoVerisi: ClueFotoVerisi;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(false);

  const measurementKeys = Object.keys(fotoVerisi.olayYeriIzi);

  const handleSelect = (suspectId: string) => {
    if (isSolved) return;
    setSelected(suspectId);
    setWrongAttempt(false);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const match = fotoVerisi.supheliAyakkabilari.find((p) => p.suspectId === selected);
    if (match?.eslesme) {
      onSolve();
    } else {
      setWrongAttempt(true);
      setSelected(null);
    }
  };

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Eşleşme Bulundu!</Text>
        <Text style={styles.miniGameAciklama}>{fotoVerisi.sonuc}</Text>
      </View>
    );
  }

  return (
    <View style={styles.faceMatchBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="face-retouching-natural" size={14} color="#9333ea" />
        <Text style={[styles.gorselLabel, { color: "#9333ea" }]}>GÖRSEL KARŞILAŞTIRMA</Text>
      </View>
      <Text style={styles.faceMatchAciklama}>{fotoVerisi.aciklama}</Text>

      <View style={styles.faceMatchReferans}>
        <Text style={styles.faceMatchRefLabel}>REFERANS İZ</Text>
        <View style={styles.faceMatchMeasurements}>
          {measurementKeys.map((key) => (
            <View key={key} style={styles.faceMatchMeasRow}>
              <Text style={styles.faceMatchMeasKey}>{key}</Text>
              <Text style={styles.faceMatchMeasVal}>{fotoVerisi.olayYeriIzi[key]}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.faceMatchSelectLabel}>Eşleşen kişiyi seç:</Text>
      {fotoVerisi.supheliAyakkabilari.map((p) => {
        const isSelected = selected === p.suspectId;
        return (
          <Pressable
            key={p.suspectId}
            onPress={() => handleSelect(p.suspectId)}
            style={[styles.faceMatchCard, isSelected && styles.faceMatchCardSelected]}
          >
            <Text style={styles.faceMatchSuspectId}>{p.suspectId.toUpperCase()}</Text>
            <View style={styles.faceMatchMeasurements}>
              {measurementKeys.map((key) => {
                const val = p[key] as string | undefined;
                const refVal = fotoVerisi.olayYeriIzi[key];
                const match = val === refVal;
                return (
                  <View key={key} style={styles.faceMatchMeasRow}>
                    <Text style={styles.faceMatchMeasKey}>{key}</Text>
                    <Text style={[styles.faceMatchMeasVal, match && styles.faceMatchMeasMatch]}>
                      {val ?? "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Pressable>
        );
      })}

      <Pressable
        style={[styles.dnaConfirmBtn, !selected && styles.dnaConfirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!selected}
      >
        <Text style={styles.dnaConfirmText}>Onayla</Text>
      </Pressable>
      {wrongAttempt && <Text style={styles.dnaWrong}>Yanlış eşleşme — tekrar incele</Text>}
    </View>
  );
}

function TimelineSortBlock({
  timelineVerisi,
  isSolved,
  onSolve,
}: {
  timelineVerisi: ClueTimelineVerisi;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const [order, setOrder] = useState(() =>
    [...timelineVerisi.olaylar].sort(() => Math.random() - 0.5)
  );
  const [checked, setChecked] = useState(false);
  const [wrong, setWrong] = useState(false);

  const moveUp = (i: number) => {
    if (i === 0) return;
    const newOrder = [...order];
    [newOrder[i - 1], newOrder[i]] = [newOrder[i], newOrder[i - 1]];
    setOrder(newOrder);
    setWrong(false);
  };

  const moveDown = (i: number) => {
    if (i === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[i], newOrder[i + 1]] = [newOrder[i + 1], newOrder[i]];
    setOrder(newOrder);
    setWrong(false);
  };

  const verify = () => {
    const correct = order.every((ev, i) => ev.dogruSira === i + 1);
    if (correct) {
      onSolve();
    } else {
      setWrong(true);
    }
    setChecked(true);
  };

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Zaman Çizelgesi Tamamlandı!</Text>
        <Text style={styles.miniGameAciklama}>{timelineVerisi.sonuc}</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineBlock}>
      <View style={styles.gorselHeader}>
        <MaterialIcons name="timeline" size={14} color="#C8372D" />
        <Text style={[styles.gorselLabel, { color: "#C8372D" }]}>ZAMAN ÇİZELGESİ SIRALA</Text>
      </View>
      <Text style={styles.timelineAciklama}>{timelineVerisi.aciklama}</Text>
      {order.map((ev, i) => (
        <View key={ev.id} style={styles.timelineCard}>
          <View style={styles.timelineIndex}>
            <Text style={styles.timelineIndexText}>{i + 1}</Text>
          </View>
          <Text style={styles.timelineMetin} numberOfLines={3}>{ev.metin}</Text>
          <View style={styles.timelineBtns}>
            <Pressable
              style={[styles.timelineBtn, i === 0 && styles.timelineBtnDisabled]}
              onPress={() => moveUp(i)}
              disabled={i === 0}
            >
              <MaterialIcons name="keyboard-arrow-up" size={20} color={i === 0 ? "#333" : "#D4A843"} />
            </Pressable>
            <Pressable
              style={[styles.timelineBtn, i === order.length - 1 && styles.timelineBtnDisabled]}
              onPress={() => moveDown(i)}
              disabled={i === order.length - 1}
            >
              <MaterialIcons name="keyboard-arrow-down" size={20} color={i === order.length - 1 ? "#333" : "#D4A843"} />
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable style={styles.timelineVerifyBtn} onPress={verify}>
        <MaterialIcons name="check" size={16} color="#0F1117" />
        <Text style={styles.timelineVerifyText}>Sırayı Doğrula</Text>
      </Pressable>
      {wrong && <Text style={styles.timelineWrong}>Yanlış sıra — tekrar dene</Text>}
    </View>
  );
}

function ProfilSenteziBlock({
  profilSenteziVerisi,
  isSolved,
  onSolve,
}: {
  profilSenteziVerisi: import("../data/puzzles").ClueProfilSenteziVerisi;
  isSolved?: boolean;
  onSolve: () => void;
}) {
  const { gameState } = useGame();
  const suspects = gameState?.puzzle?.suspects ?? [];
  const [selected, setSelected] = React.useState<string | null>(null);
  const [wrong, setWrong] = React.useState(false);

  if (isSolved) {
    return (
      <View style={styles.profilBlock}>
        <View style={styles.profilHeader}>
          <MaterialIcons name="person-search" size={14} color="#A855F7" />
          <Text style={styles.profilHeaderText}>PROFİL SENTEZİ</Text>
        </View>
        <View style={styles.profilSolvedBadge}>
          <MaterialIcons name="check-circle" size={14} color="#22c55e" />
          <Text style={styles.profilSolvedText}>{profilSenteziVerisi.successText}</Text>
        </View>
      </View>
    );
  }

  const verify = () => {
    if (!selected) return;
    if (selected === profilSenteziVerisi.answerSuspectId) {
      onSolve();
    } else {
      setWrong(true);
      setSelected(null);
      setTimeout(() => setWrong(false), 2000);
    }
  };

  return (
    <View style={styles.profilBlock}>
      <View style={styles.profilHeader}>
        <MaterialIcons name="person-search" size={14} color="#A855F7" />
        <Text style={styles.profilHeaderText}>PROFİL SENTEZİ</Text>
      </View>
      <Text style={styles.profilAciklama}>{profilSenteziVerisi.aciklama}</Text>
      <View style={styles.profilDelilRow}>
        {profilSenteziVerisi.delilKartlari.map((d) => (
          <View key={d.id} style={styles.profilDelilKart}>
            <Text style={styles.profilDelilBaslik}>{d.baslik}</Text>
            <Text style={styles.profilDelilMetin}>{d.metin}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.profilSelectLabel}>Hangi şüpheli bu üç işareti taşıyor?</Text>
      <View style={styles.profilOptionsRow}>
        {profilSenteziVerisi.optionSuspectIds.map((sid) => {
          const suspectName = suspects.find((s) => s.id === sid)?.name ?? sid.toUpperCase();
          return (
            <Pressable
              key={sid}
              style={[styles.profilOption, selected === sid && styles.profilOptionSelected]}
              onPress={() => setSelected(sid)}
            >
              <View style={[styles.profilRadio, selected === sid && styles.profilRadioSelected]}>
                {selected === sid && <View style={styles.profilRadioDot} />}
              </View>
              <Text style={[styles.profilOptionText, selected === sid && styles.profilOptionTextSelected]}>
                {suspectName}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={[styles.profilVerifyBtn, !selected && styles.profilVerifyBtnDisabled]}
        onPress={verify}
        disabled={!selected}
      >
        <MaterialIcons name="check" size={16} color="#0F1117" />
        <Text style={styles.profilVerifyText}>Profili Onayla</Text>
      </Pressable>
      {wrong && <Text style={styles.profilWrong}>{profilSenteziVerisi.failureText}</Text>}
    </View>
  );
}

export default function ClueCard({
  clue,
  index,
  isRevealed,
  isBonus,
  isSolved = false,
  onRevealBonus,
  onSolveMechanic,
}: Props) {
  const colors = useColors();
  const opacity = useSharedValue(isRevealed ? 1 : isBonus ? 0.9 : 0.4);
  const translateY = useSharedValue(isRevealed ? 0 : 4);

  React.useEffect(() => {
    opacity.value = withSpring(isRevealed ? 1 : isBonus ? 0.9 : 0.4);
    translateY.value = withSpring(isRevealed ? 0 : 4);
  }, [isRevealed, isBonus]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const meta = CLUE_META[clue.type] ?? CLUE_META.direct;
  const mechanic = clue.mechanicType ?? "text";

  const handleBonusReveal = () => {
    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm(
        "Bu ipucunu açmak zaman sayacınıza +30 saniye ekler. Devam etmek istiyor musunuz?"
      );
      if (confirmed) onRevealBonus?.();
      return;
    }

    Alert.alert(
      "Ek İpucu",
      "Bu ipucunu açmak zaman sayacınıza +30 saniye ekler. Devam etmek istiyor musunuz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Aç (+30 sn)",
          style: "destructive",
          onPress: () => onRevealBonus?.(),
        },
      ]
    );
  };

  if (isBonus && !isRevealed) {
    return (
      <Animated.View style={[styles.container, animStyle]}>
        <Pressable
          onPress={onRevealBonus ? handleBonusReveal : undefined}
          style={[
            styles.card,
            {
              backgroundColor: "#0D0D18",
              borderColor: "#D4A84344",
              borderWidth: 1,
              borderStyle: "dashed",
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: "#D4A84322" }]}>
              <MaterialIcons name="lock" size={14} color="#D4A843" />
            </View>
            <View style={[styles.bonusBadge, { backgroundColor: "#D4A84318", borderColor: "#D4A84355" }]}>
              <MaterialIcons name="star" size={10} color="#D4A843" />
              <Text style={styles.bonusBadgeText}>Ek İpucu</Text>
            </View>
            <Text style={[styles.clueNumber, { color: "#666" }]}>
              İpucu {index + 1}
            </Text>
          </View>
          <View style={styles.lockedBody}>
            <View style={styles.lockedLines}>
              <View style={[styles.lockedLine, { backgroundColor: "#1A1F2E", width: "80%" }]} />
              <View style={[styles.lockedLine, { backgroundColor: "#1A1F2E", width: "60%" }]} />
              <View style={[styles.lockedLine, { backgroundColor: "#1A1F2E", width: "70%" }]} />
            </View>
            {onRevealBonus && (
              <Pressable
                onPress={handleBonusReveal}
                style={[styles.unlockBtn, { backgroundColor: "#1A1F2E", borderColor: "#D4A84344" }]}
              >
                <MaterialIcons name="lock-open" size={14} color="#D4A843" />
                <Text style={[styles.unlockBtnText, { color: "#D4A843" }]}>Açmak için dokun</Text>
                <View style={[styles.penaltyTag, { backgroundColor: "#C8372D22", borderColor: "#C8372D44" }]}>
                  <MaterialIcons name="timer" size={10} color="#C8372D" />
                  <Text style={[styles.penaltyTagText, { color: "#C8372D" }]}>+30 sn</Text>
                </View>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  const renderMechanicContent = () => {
    switch (mechanic) {
      case "gorsel_ipucu":
        return clue.gorselAciklama ? (
          <GorselIpucuBlock aciklama={clue.gorselAciklama} />
        ) : null;

      case "ses_kaydi":
        if (clue.audioPuzzle?.style === "telephone_switchboard") {
          return (
            <TelephoneSwitchboardBlock
              clue={clue}
              isSolved={isSolved ?? false}
              onSolve={() => onSolveMechanic?.()}
            />
          );
        }
        return (
          <SesKaydiBlock audioAssetId={clue.audioAssetId} />
        );

      case "tanik_yuzlesme":
        return clue.yuzlesmeDialogu ? (
          <TanikYuzlesmeBlock dialoglar={clue.yuzlesmeDialogu} />
        ) : null;

      case "sifreli_mesaj":
        return clue.sifre ? (
          <SifreliMesajBlock
            sifre={clue.sifre}
            isSolved={isSolved ?? false}
            onSolve={() => onSolveMechanic?.()}
          />
        ) : null;

      case "phone_chain":
        return clue.phoneVerisi ? (
          <PhoneChainBlock phoneVerisi={clue.phoneVerisi} />
        ) : null;

      case "anagram":
        return clue.anagramVerisi ? (
          <AnagramBlock
            anagramVerisi={clue.anagramVerisi}
            isSolved={isSolved}
            onSolve={() => onSolveMechanic?.()}
          />
        ) : null;

      case "parmak_izi":
        return clue.parmakIziVerisi ? (
          <ParmakIziBlock
            parmakIziVerisi={clue.parmakIziVerisi}
            isSolved={isSolved}
            onSolve={() => onSolveMechanic?.()}
          />
        ) : null;

      case "dna_match":
        return clue.dnaVerisi ? (
          <DnaMatchBlock
            dnaVerisi={clue.dnaVerisi}
            isSolved={isSolved}
            onSolve={() => onSolveMechanic?.()}
          />
        ) : null;

      case "timeline_sort":
        return clue.timelineVerisi ? (
          <TimelineSortBlock
            timelineVerisi={clue.timelineVerisi}
            isSolved={isSolved}
            onSolve={() => onSolveMechanic?.()}
          />
        ) : null;

      case "face_match":
        return clue.fotoVerisi ? (
          <FaceMatchBlock
            fotoVerisi={clue.fotoVerisi}
            isSolved={isSolved}
            onSolve={() => onSolveMechanic?.()}
          />
        ) : null;

      case "profil_sentezi":
        return clue.profilSenteziVerisi ? (
          <ProfilSenteziBlock
            profilSenteziVerisi={clue.profilSenteziVerisi}
            isSolved={isSolved}
            onSolve={() => onSolveMechanic?.()}
          />
        ) : null;

      default:
        return null;
    }
  };

  const mechanicContent = isRevealed ? renderMechanicContent() : null;
  const showDeductionHint = clue.deductionHint && isRevealed &&
    (mechanic === "text" || mechanic === "gorsel_ipucu" || mechanic === "ses_kaydi" || mechanic === "tanik_yuzlesme" || mechanic === "phone_chain" ||
      ((mechanic === "sifreli_mesaj" || mechanic === "parmak_izi" || mechanic === "anagram" || mechanic === "dna_match" || mechanic === "timeline_sort" || mechanic === "face_match" || mechanic === "profil_sentezi") && isSolved));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isRevealed ? meta.cardTint : colors.card,
            borderColor: isRevealed ? meta.color : colors.border,
            borderWidth: isRevealed ? 1.5 : 1,
            borderStyle: isRevealed ? meta.borderStyle : "solid",
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: `${meta.color}22` }]}>
            <MaterialIcons name={meta.icon} size={14} color={meta.color} />
          </View>
          <Text style={[styles.clueLabel, { color: meta.color }]}>
            {meta.label}
          </Text>
          {isBonus && isRevealed && (
            <View style={[styles.bonusBadge, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b44" }]}>
              <MaterialIcons name="star" size={10} color="#f59e0b" />
              <Text style={[styles.bonusBadgeText, { color: "#f59e0b" }]}>Ek İpucu</Text>
            </View>
          )}
          <Text style={[styles.clueNumber, { color: colors.mutedForeground }]}>
            İpucu {index + 1}
          </Text>
        </View>

        <Text style={[styles.clueText, { color: colors.foreground }]}>{clue.text}</Text>

        {mechanicContent}

        {showDeductionHint && clue.deductionHint ? (
          <DeductionHint hint={clue.deductionHint} />
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  card: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clueLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  bonusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
  },
  bonusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D4A843",
    letterSpacing: 0.3,
  },
  clueNumber: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  clueText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
    marginBottom: 8,
  },
  lockedBody: {
    gap: 10,
  },
  lockedLines: {
    gap: 6,
  },
  lockedLine: {
    height: 10,
    borderRadius: 5,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  unlockBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  penaltyTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 2,
    marginLeft: 4,
  },
  penaltyTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  deductionHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 8,
    backgroundColor: "#D4A84310",
    borderRadius: 6,
    padding: 7,
    borderLeftWidth: 2,
    borderLeftColor: "#D4A84366",
  },
  deductionHintText: {
    fontSize: 12,
    color: "#D4A843aa",
    flex: 1,
    lineHeight: 17,
    fontStyle: "italic",
  },
  gorselBlock: {
    backgroundColor: "#1a1400",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D4A84344",
    marginTop: 6,
  },
  gorselHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 7,
  },
  gorselLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D4A843",
    letterSpacing: 0.8,
  },
  gorselText: {
    fontSize: 13,
    color: "#D4A843cc",
    lineHeight: 19,
    fontStyle: "italic",
  },
  sesBlock: {
    backgroundColor: "#0a0f1e",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#3b82f644",
    marginTop: 6,
  },
  sesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 7,
  },
  sesLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3b82f6",
    letterSpacing: 0.8,
    flex: 1,
  },
  sesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sesDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C8372D",
  },
  sesRec: {
    fontSize: 9,
    fontWeight: "700",
    color: "#C8372D",
    letterSpacing: 0.5,
  },
  sesText: {
    fontSize: 13,
    color: "#8cb4ff",
    lineHeight: 19,
    fontStyle: "italic",
    marginTop: 6,
  },
  sesDotActive: {
    backgroundColor: "#22c55e",
  },
  sesPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  sesPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  sesProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#1e3a5f",
    borderRadius: 2,
    overflow: "hidden",
  },
  sesProgressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 2,
  },
  sesPlayBtnDisabled: {
    backgroundColor: "#1e3a5f",
    opacity: 0.5,
  },
  yuzlesmeBlock: {
    marginTop: 6,
    gap: 8,
  },
  yuzlesmeRow: {
    gap: 4,
  },
  soruBubble: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#1A1F2E",
    borderRadius: 7,
    padding: 8,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  soruLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
  },
  soruText: {
    fontSize: 13,
    color: "#aaa",
    lineHeight: 18,
    flex: 1,
  },
  cevapBubble: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    backgroundColor: "#1e2a1e",
    borderRadius: 7,
    padding: 8,
    alignSelf: "flex-end",
    maxWidth: "90%",
    borderWidth: 1,
    borderColor: "#22c55e33",
  },
  cevapBubbleYalan: {
    backgroundColor: "#2a1010",
    borderColor: "#C8372D44",
  },
  cevapLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#22c55e",
  },
  cevapText: {
    fontSize: 13,
    color: "#aaa",
    lineHeight: 18,
    flex: 1,
  },
  cevapTextYalan: {
    color: "#ff8080",
    textDecorationLine: "line-through",
  },
  yalanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#C8372D22",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 2,
  },
  yalanText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#C8372D",
    letterSpacing: 0.5,
  },
  terminalBlock: {
    backgroundColor: "#080c10",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e3a2a",
    marginTop: 8,
    overflow: "hidden",
  },
  terminalTitleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0e1a13",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e3a2a",
  },
  terminalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C8372D",
  },
  terminalTitleText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#22c55e",
    letterSpacing: 1.5,
    marginLeft: 4,
    fontFamily: "monospace",
  },
  terminalContext: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#4a7c59",
    lineHeight: 17,
    padding: 12,
    paddingBottom: 0,
  },
  terminalDivider: {
    height: 1,
    backgroundColor: "#1e3a2a",
    marginVertical: 8,
    marginHorizontal: 12,
  },
  terminalField: {
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 6,
  },
  terminalFieldLabel: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    color: "#22c55e",
    letterSpacing: 1,
  },
  terminalOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  terminalOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#1e3a2a",
    backgroundColor: "#0d1810",
  },
  terminalOptionSelected: {
    backgroundColor: "#0a2e18",
    borderColor: "#22c55e",
  },
  terminalOptionText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#4a7c59",
    fontWeight: "600",
  },
  terminalOptionTextSelected: {
    color: "#22c55e",
  },
  terminalSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22c55e",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 6,
    paddingVertical: 10,
  },
  terminalSubmitBtnDisabled: {
    backgroundColor: "#0e1a13",
    borderWidth: 1,
    borderColor: "#1e3a2a",
  },
  terminalSubmitText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1117",
    letterSpacing: 0.5,
  },
  sifreBlock: {
    backgroundColor: "#0f0a1a",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#9333ea44",
    marginTop: 6,
    gap: 6,
  },
  sifreText: {
    fontFamily: "monospace",
    fontSize: 14,
    color: "#9333ea",
    letterSpacing: 1.5,
    lineHeight: 22,
  },
  sifreDivider: {
    height: 1,
    backgroundColor: "#9333ea22",
    marginVertical: 2,
  },
  sifreIpucu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sifreIpucuText: {
    fontSize: 11,
    color: "#9333ea88",
    fontStyle: "italic",
  },
  sifreAciklama: {
    fontSize: 12,
    color: "#c084fc",
    lineHeight: 18,
  },
  sifreHintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#C8372D",
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  sifreHintBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  sifreHintRevealed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sifreHintRevealedLabel: {
    fontSize: 11,
    fontStyle: "italic",
  },
  sifreInput: {
    backgroundColor: "#1A1F2E",
    borderWidth: 1,
    borderColor: "#9333ea44",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "#fff",
    fontSize: 14,
    fontFamily: "monospace",
    letterSpacing: 1,
    marginTop: 4,
  },
  sifreCozBtn: {
    backgroundColor: "#D4A843",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  sifreCozBtnText: {
    color: "#0F1117",
    fontWeight: "700",
    fontSize: 14,
  },
  thermalBlock: {
    backgroundColor: "#060d1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0ea5e940",
    overflow: "hidden",
    marginTop: 4,
  },
  thermalTitleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#071525",
    borderBottomWidth: 1,
    borderBottomColor: "#0ea5e930",
  },
  thermalTitleText: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginLeft: 4,
    fontFamily: "monospace",
  },
  thermalInstruction: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  thermalAccent: {
    color: "#38bdf8",
    fontWeight: "600",
  },
  thermalCardList: {
    paddingHorizontal: 12,
    gap: 5,
    paddingBottom: 4,
  },
  thermalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0c1b2e",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
  },
  thermalCardSelected: {
    borderColor: "#38bdf8",
    backgroundColor: "#0a2540",
  },
  thermalCardWrong: {
    borderColor: "#ef444466",
    backgroundColor: "#1a0a0a",
  },
  thermalCardPos: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  thermalCardPosText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
  thermalCardCenter: {
    flex: 1,
    gap: 2,
  },
  thermalCardTemp: {
    color: "#bae6fd",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  thermalCardNote: {
    color: "#475569",
    fontSize: 10,
    lineHeight: 13,
    fontStyle: "italic",
  },
  thermalCardRight: {
    alignItems: "center",
    gap: 3,
  },
  thermalCardId: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  thermalGlyphLock: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  thermalGlyphUnlocked: {
    backgroundColor: "#0ea5e920",
    borderColor: "#38bdf8",
  },
  thermalGlyphLockText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  thermalGlyphUnlockedText: {
    color: "#38bdf8",
    fontWeight: "700",
  },
  thermalCardSwapHint: {
    position: "absolute",
    right: 6,
    top: 6,
  },
  thermalErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  thermalErrorText: {
    color: "#ef4444",
    fontSize: 11,
  },
  thermalSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    margin: 12,
    marginTop: 10,
    backgroundColor: "#0ea5e9",
    borderRadius: 8,
    paddingVertical: 10,
  },
  thermalSubmitText: {
    color: "#0F1117",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  thermalSolvedBlock: {
    backgroundColor: "#060d1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#22c55e40",
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  thermalSolvedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  thermalSolvedTitle: {
    color: "#22c55e",
    fontWeight: "700",
    fontSize: 14,
  },
  thermalSolvedGlyphs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  thermalGlyphWord: {
    flexDirection: "row",
    gap: 4,
  },
  thermalGlyphSep: {
    color: "#38bdf8",
    fontSize: 16,
  },
  thermalGlyphChip: {
    width: 30,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#0ea5e920",
    borderWidth: 1,
    borderColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
  },
  thermalGlyphChipText: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  crossgridBlock: {
    backgroundColor: "#10131f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2210",
    overflow: "hidden",
    marginTop: 4,
  },
  crossgridTitleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#18140a",
    borderBottomWidth: 1,
    borderBottomColor: "#2e2410",
  },
  crossgridTitleText: {
    color: "#e0b54e",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    fontFamily: "monospace",
  },
  crossgridSubtitle: {
    color: "#8b91ad",
    fontSize: 11,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    lineHeight: 16,
  },
  crossgridPurpose: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#e0b54e",
    backgroundColor: "#1c1708",
    borderRadius: 4,
  },
  crossgridPurposeLabel: {
    color: "#e0b54e",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 3,
  },
  crossgridPurposeText: {
    color: "#ecd99a",
    fontSize: 11,
    lineHeight: 16,
  },
  crossgridScroll: {
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#262c44",
    borderRadius: 8,
    overflow: "hidden",
  },
  crossgridCipherSection: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#161a2b",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262c44",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  crossgridChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingTop: 8,
    gap: 6,
  },
  crossgridChip: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#2e3450",
    backgroundColor: "#10131f",
    gap: 2,
  },
  crossgridChipActive: {
    borderColor: "#e0b54e",
    backgroundColor: "#1c1708",
  },
  crossgridChipSymbol: {
    fontSize: 15,
    color: "#6b7399",
    lineHeight: 18,
  },
  crossgridChipLetter: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3d4566",
    lineHeight: 20,
  },
  crossgridChipLetterActive: {
    color: "#e0b54e",
  },
  crossgridChipSep: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  crossgridChipSepText: {
    color: "#6b7399",
    fontSize: 18,
    fontWeight: "300",
    lineHeight: 40,
  },
  crossgridAnswerPreview: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#262c44",
  },
  crossgridAnswerPreviewText: {
    color: "#e0b54e",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  crossgridRow: {
    flexDirection: "row",
  },
  crossgridCell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#262c44",
  },
  crossgridCorner: {
    backgroundColor: "#14192a",
  },
  crossgridCornerText: {
    color: "#e0b54e",
    fontSize: 12,
    fontWeight: "700",
  },
  crossgridColHeader: {
    backgroundColor: "#1c2138",
  },
  crossgridRowHeader: {
    backgroundColor: "#171c2e",
  },
  crossgridHeaderText: {
    color: "#e0b54e",
    fontSize: 12,
    fontWeight: "700",
  },
  crossgridDataCell: {
    backgroundColor: "#161a2b",
  },
  crossgridCellText: {
    color: "#dbe2f7",
    fontSize: 12,
    fontWeight: "600",
  },
  crossgridCipherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#161a2b",
  },
  crossgridCipherLabel: {
    color: "#8b91ad",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  crossgridCipherText: {
    color: "#e0b54e",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
    fontFamily: "monospace",
    flex: 1,
    textAlign: "center",
  },
  crossgridSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    margin: 12,
    marginTop: 8,
    backgroundColor: "#e0b54e",
    borderRadius: 8,
    paddingVertical: 11,
  },
  crossgridSubmitText: {
    color: "#1a1205",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  switchboardBlock: {
    backgroundColor: "#0e1119",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262c44",
    overflow: "hidden",
    marginTop: 4,
  },
  switchboardTitleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#18140a",
    borderBottomWidth: 1,
    borderBottomColor: "#2e2410",
  },
  switchboardTitleText: {
    color: "#e0b54e",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  switchboardSubtitle: {
    color: "#8b91ad",
    fontSize: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    lineHeight: 17,
  },
  switchboardPurpose: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#e0b54e",
    backgroundColor: "#1c1708",
    borderRadius: 4,
  },
  switchboardPurposeLabel: {
    color: "#e0b54e",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 3,
  },
  switchboardPurposeText: {
    color: "#ecd99a",
    fontSize: 11,
    lineHeight: 16,
  },
  switchboardSectionLabel: {
    color: "#e0b54e",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  switchboardSegments: {
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  switchboardSegBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262c44",
    backgroundColor: "#161a2b",
  },
  switchboardSegBtnActive: {
    borderColor: "#e0b54e",
    backgroundColor: "#1c1708",
  },
  switchboardSegBtnText: {
    color: "#8b91ad",
    fontSize: 13,
    fontWeight: "500",
  },
  switchboardQuestion: {
    color: "#d6dae8",
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  switchboardOptions: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  switchboardOptionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262c44",
    backgroundColor: "#161a2b",
  },
  switchboardOptionCorrect: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  switchboardOptionWrong: {
    borderColor: "#dc2626",
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  switchboardOptionText: {
    color: "#e8eaf2",
    fontSize: 13,
    fontWeight: "600",
  },
  switchboardWrong: {
    color: "#fca5a5",
    fontSize: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    lineHeight: 17,
  },
  switchboardTranscriptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e2236",
  },
  switchboardTranscriptBtnText: {
    color: "#8b91ad",
    fontSize: 12,
  },
  switchboardTranscript: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#161a2b",
    borderLeftWidth: 2,
    borderLeftColor: "#3b4268",
  },
  switchboardTranscriptText: {
    color: "#b0b8d6",
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
  },
  phoneBlock: {
    marginTop: 6,
    gap: 8,
  },
  phoneAciklama: {
    fontSize: 12,
    color: "#6ee7e7",
    lineHeight: 17,
    fontStyle: "italic",
    marginBottom: 4,
  },
  phoneCard: {
    backgroundColor: "#0a1a1a",
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: "#14b8a633",
  },
  phoneCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
    flexWrap: "wrap",
  },
  phoneFrom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  phoneFromText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#14b8a6",
  },
  phoneTo: {},
  phoneToText: {
    fontSize: 11,
    color: "#6ee7e7",
    fontWeight: "500",
  },
  phoneSaat: {
    fontSize: 10,
    color: "#444",
    marginLeft: "auto",
  },
  phoneIcerik: {
    fontSize: 12,
    color: "#8ee8e8",
    lineHeight: 17,
    fontStyle: "italic",
  },
  phoneConnector: {
    alignItems: "center",
    paddingTop: 4,
  },
  phoneConnectorLine: {
    width: 1,
    height: 10,
    backgroundColor: "#14b8a633",
  },
  phoneSonuc: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: "#14b8a610",
    borderRadius: 6,
    padding: 7,
  },
  phoneSonucText: {
    fontSize: 12,
    color: "#6ee7e7aa",
    flex: 1,
    lineHeight: 17,
    fontStyle: "italic",
  },
  anagramBlock: {
    backgroundColor: "#1a1400",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#f59e0b44",
    marginTop: 6,
    gap: 8,
  },
  anagramKarisik: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f59e0b",
    letterSpacing: 4,
    textAlign: "center",
  },
  anagramIpucu: {
    fontSize: 11,
    color: "#f59e0b88",
    fontStyle: "italic",
    textAlign: "center",
  },
  anagramInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  anagramInput: {
    flex: 1,
    backgroundColor: "#0F1117",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f59e0b44",
    color: "#f59e0b",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    letterSpacing: 2,
  },
  anagramInputError: {
    borderColor: "#C8372D",
  },
  anagramBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  anagramWrong: {
    fontSize: 11,
    color: "#C8372D",
    textAlign: "center",
  },
  dnaBlock: {
    backgroundColor: "#0a1a15",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#14b8a644",
    marginTop: 6,
    gap: 8,
  },
  dnaAciklama: {
    fontSize: 12,
    color: "#6ee7e7aa",
    fontStyle: "italic",
    lineHeight: 17,
  },
  dnaOrnekCard: {
    backgroundColor: "#0F1117",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#14b8a6",
  },
  dnaOrnekLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#14b8a6",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  dnaLokusRow: {
    flexDirection: "row",
    gap: 8,
  },
  dnaLokus: {
    alignItems: "center",
    flex: 1,
  },
  dnaLokusKey: {
    fontSize: 9,
    color: "#555",
    fontWeight: "600",
    marginBottom: 2,
  },
  dnaLokusVal: {
    fontSize: 13,
    color: "#aaa",
    fontWeight: "700",
    fontFamily: "monospace",
  },
  dnaLokusMatch: {
    color: "#22c55e",
  },
  dnaSelectLabel: {
    fontSize: 11,
    color: "#6ee7e7",
    fontStyle: "italic",
  },
  dnaCard: {
    backgroundColor: "#0F1117",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  dnaCardSelected: {
    borderColor: "#14b8a6",
    backgroundColor: "#0a1a15",
  },
  dnaCardWrong: {
    borderColor: "#C8372D",
    backgroundColor: "#1a0a0a",
  },
  dnaCardCorrect: {
    borderColor: "#22c55e",
    backgroundColor: "#0a1a0a",
  },
  dnaSuspectId: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  dnaConfirmBtn: {
    backgroundColor: "#14b8a6",
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  dnaConfirmBtnDisabled: {
    backgroundColor: "#1a2a2a",
  },
  dnaConfirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1117",
  },
  dnaWrong: {
    fontSize: 11,
    color: "#C8372D",
    textAlign: "center",
  },
  parmakIziBlock: {
    backgroundColor: "#1a1000",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#f9731630",
  },
  parmakIziAciklama: {
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 16,
    marginBottom: 8,
  },
  parmakIziSelectLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f97316",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  parmakIziCard: {
    backgroundColor: "#0F1117",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#f9731620",
  },
  parmakIziCardSelected: {
    borderColor: "#f97316",
    backgroundColor: "#f9731615",
  },
  parmakIziCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  parmakIziKonum: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    flex: 1,
  },
  parmakIziIpucu: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 15,
    paddingLeft: 22,
  },
  parmakIziWrong: {
    fontSize: 11,
    color: "#C8372D",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  parmakIziConfirmBtn: {
    backgroundColor: "#f97316",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#fb923c",
  },
  parmakIziConfirmBtnDisabled: {
    backgroundColor: "#2a1800",
    borderColor: "#f9731640",
  },
  parmakIziConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  fpSceneContainer: {
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  fpSceneLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f97316",
    letterSpacing: 1.5,
    alignSelf: "flex-start",
  },
  fpSceneFrame: {
    width: 110,
    height: 110,
    borderRadius: 8,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#f9731640",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fpSceneImage: {
    width: 100,
    height: 100,
  },
  fpSceneOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F111780",
  },
  fpSceneSubLabel: {
    fontSize: 10,
    color: "#64748b",
    fontStyle: "italic",
    alignSelf: "flex-start",
  },
  fpSuspectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  fpSuspectCard: {
    flex: 1,
    minWidth: 80,
    alignItems: "center",
    backgroundColor: "#0F1117",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f9731620",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 4,
  },
  fpSuspectCardSelected: {
    borderColor: "#f97316",
    backgroundColor: "#f9731615",
  },
  fpSuspectName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center",
  },
  timelineBlock: {
    backgroundColor: "#1a0a0a",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#C8372D44",
    marginTop: 6,
    gap: 8,
  },
  timelineAciklama: {
    fontSize: 12,
    color: "#ff8080aa",
    fontStyle: "italic",
    lineHeight: 17,
  },
  timelineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0F1117",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#C8372D33",
  },
  timelineIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#C8372D22",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineIndexText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C8372D",
  },
  timelineMetin: {
    flex: 1,
    fontSize: 12,
    color: "#ccc",
    lineHeight: 17,
  },
  timelineBtns: {
    flexDirection: "column",
  },
  timelineBtn: {
    padding: 2,
  },
  timelineBtnDisabled: {
    opacity: 0.2,
  },
  timelineVerifyBtn: {
    backgroundColor: "#C8372D",
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timelineVerifyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  timelineWrong: {
    fontSize: 11,
    color: "#C8372D",
    textAlign: "center",
  },
  profilBlock: {
    backgroundColor: "#130d1f",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#A855F744",
    marginTop: 8,
    gap: 10,
  },
  profilHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profilHeaderText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A855F7",
    letterSpacing: 1.5,
  },
  profilAciklama: {
    fontSize: 12,
    color: "#aaa",
    lineHeight: 17,
  },
  profilDelilRow: {
    gap: 8,
  },
  profilDelilKart: {
    backgroundColor: "#1a1128",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#A855F733",
    gap: 4,
  },
  profilDelilBaslik: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A855F7",
    letterSpacing: 0.5,
  },
  profilDelilMetin: {
    fontSize: 12,
    color: "#ccc",
    lineHeight: 16,
  },
  profilSelectLabel: {
    fontSize: 12,
    color: "#aaa",
    fontStyle: "italic",
  },
  profilOptionsRow: {
    gap: 6,
  },
  profilOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A855F755",
    backgroundColor: "#1a1128",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profilOptionSelected: {
    backgroundColor: "#A855F722",
    borderColor: "#A855F7",
  },
  profilOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ccc",
    flex: 1,
  },
  profilOptionTextSelected: {
    color: "#A855F7",
    fontWeight: "700",
  },
  profilRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#A855F755",
    alignItems: "center",
    justifyContent: "center",
  },
  profilRadioSelected: {
    borderColor: "#A855F7",
  },
  profilRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A855F7",
  },
  profilVerifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#A855F7",
    borderRadius: 8,
    paddingVertical: 10,
  },
  profilVerifyBtnDisabled: {
    backgroundColor: "#A855F744",
  },
  profilVerifyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  profilWrong: {
    fontSize: 11,
    color: "#C8372D",
    textAlign: "center",
  },
  profilSolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profilSolvedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#22c55e",
  },
  miniGameSolvedBlock: {
    backgroundColor: "#0a1a0a",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#22c55e44",
    marginTop: 6,
    alignItems: "center",
    gap: 6,
  },
  miniGameSolvedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#22c55e",
  },
  miniGameAnswer: {
    backgroundColor: "#0F1117",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#22c55e44",
  },
  miniGameAnswerText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#22c55e",
    letterSpacing: 2,
  },
  miniGameAciklama: {
    fontSize: 12,
    color: "#22c55eaa",
    lineHeight: 17,
    textAlign: "center",
  },
  fpMiniStory: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 18,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 8,
  },
  fpMiniStoryBold: {
    fontWeight: "700",
    fontStyle: "normal",
    color: "#f97316",
  },
  faceMatchBlock: {
    backgroundColor: "#110a1a",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#9333ea44",
    marginTop: 6,
    gap: 8,
  },
  faceMatchAciklama: {
    fontSize: 12,
    color: "#c4b5fdaa",
    fontStyle: "italic",
    lineHeight: 17,
  },
  faceMatchReferans: {
    backgroundColor: "#0F1117",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#9333ea",
  },
  faceMatchRefLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9333ea",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  faceMatchMeasurements: {
    gap: 4,
  },
  faceMatchMeasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faceMatchMeasKey: {
    fontSize: 10,
    color: "#777",
    fontWeight: "600",
    flex: 1,
  },
  faceMatchMeasVal: {
    fontSize: 12,
    color: "#aaa",
    fontWeight: "700",
    fontFamily: "monospace",
    textAlign: "right",
  },
  faceMatchMeasMatch: {
    color: "#22c55e",
  },
  faceMatchSelectLabel: {
    fontSize: 11,
    color: "#c4b5fd",
    fontStyle: "italic",
  },
  faceMatchCard: {
    backgroundColor: "#0F1117",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  faceMatchCardSelected: {
    borderColor: "#9333ea",
    backgroundColor: "#110a1a",
  },
  faceMatchSuspectId: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
});
