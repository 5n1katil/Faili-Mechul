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
  rc_002_c3_hat_a: require("../assets/audio/cases/rc_002/rc_002_c3_hat_a.mp3"),
  rc_002_c3_hat_b: require("../assets/audio/cases/rc_002/rc_002_c3_hat_b.mp3"),
  rc_002_c3_hat_c: require("../assets/audio/cases/rc_002/rc_002_c3_hat_c.mp3"),
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

  useEffect(() => {
    return () => { sound?.unloadAsync(); };
  }, [sound]);

  const playSegment = async (seg: { id: string; label?: string; audioAssetId?: string }) => {
    try {
      if (sound) { await sound.unloadAsync(); setSound(null); }
      setActiveSegId(seg.id);
      const assetSource = seg.audioAssetId ? AUDIO_ASSETS[seg.audioAssetId] as import("expo-av").AVPlaybackSource : null;
      if (!assetSource) return;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync(
        assetSource,
        { shouldPlay: false },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setActiveSegId(null);
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

function TornRouteReconstructionBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const p = sifre.presentation ?? {};
  const pieces: Array<{ id: string; label: string; leftTear: string; rightTear: string; text: string }> =
    Array.isArray((p as Record<string, unknown>).pieces) ? (p as Record<string, unknown>).pieces as Array<{ id: string; label: string; leftTear: string; rightTear: string; text: string }> : [];
  const correctOrder: string[] = Array.isArray((p as Record<string, unknown>).correctOrder) ? (p as Record<string, unknown>).correctOrder as string[] : [];
  const interaction: Record<string, string> = ((p as Record<string, unknown>).interaction as Record<string, string>) ?? {};
  const max = correctOrder.length;

  const [selected, setSelected] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [hintRevealed, setHintRevealed] = React.useState(false);

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Rota Kuruldu!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{String((p as Record<string, unknown>).routeResult ?? "")}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  const toggle = (id: string) => {
    setResult(null);
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : prev.length < max ? [...prev, id] : prev
    );
  };

  const reset = () => { setSelected([]); setResult(null); };

  const submit = () => {
    const ok =
      selected.length === correctOrder.length &&
      selected.every((id, i) => id === correctOrder[i]);
    const message = ok
      ? (interaction.successMessage ?? "Rota doğru kuruldu.")
      : (interaction.failureMessage ?? "Yırtık sırası hatalı — tekrar dene.");
    setResult({ ok, message });
    if (ok) onSolve();
  };

  const handleHint = () => {
    if (hintRevealed) return;
    addTimePenalty(60);
    setHintRevealed(true);
  };

  return (
    <View style={styles.tornRouteBlock}>
      <View style={styles.tornRouteHeader}>
        <MaterialIcons name="route" size={14} color="#D4A843" />
        <Text style={styles.tornRouteHeaderText}>
          {String((p as Record<string, unknown>).title ?? "YIRTIK ROTA SAYFASI")}
        </Text>
      </View>
      {(p as Record<string, unknown>).purposeHint ? (
        <View style={styles.tornRoutePurposeHint}>
          <Text style={styles.tornRoutePurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.tornRoutePurposeText}>{String((p as Record<string, unknown>).purposeHint)}</Text>
        </View>
      ) : null}
      {(p as Record<string, unknown>).subtitle ? (
        <Text style={styles.tornRouteSubtitle}>{String((p as Record<string, unknown>).subtitle)}</Text>
      ) : null}
      <View style={styles.tornRoutePiecesGrid}>
        {pieces.map(piece => {
          const pos = selected.indexOf(piece.id);
          const isSelected = pos >= 0;
          return (
            <Pressable
              key={piece.id}
              style={[styles.tornRoutePiece, isSelected && styles.tornRoutePieceSelected]}
              onPress={() => toggle(piece.id)}
            >
              <View style={styles.tornRouteTearRow}>
                <Text style={styles.tornRouteTear}>◁ {piece.leftTear}</Text>
                <Text style={styles.tornRoutePieceLabel}>{piece.label}</Text>
                <Text style={styles.tornRouteTear}>{piece.rightTear} ▷</Text>
              </View>
              <Text style={styles.tornRoutePieceText}>{piece.text}</Text>
              {isSelected && (
                <View style={styles.tornRouteBadge}>
                  <Text style={styles.tornRouteBadgeText}>{pos + 1}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.tornRouteOrderBox}>
        <Text style={styles.tornRouteOrderLabel}>SEÇİLEN ROTA SIRASI</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "nowrap" }}>
            {selected.length === 0 ? (
              <Text style={styles.tornRouteOrderEmpty}>Önce yırtık parçaları seç.</Text>
            ) : selected.map((id, i) => {
              const pc = pieces.find(x => x.id === id);
              return (
                <React.Fragment key={id}>
                  {i > 0 && <Text style={styles.tornRouteArrow}> → </Text>}
                  <Text style={styles.tornRouteOrderItem}>{pc?.label}</Text>
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <View style={styles.tornRouteBtnRow}>
        <Pressable style={styles.tornRouteResetBtn} onPress={reset}>
          <Text style={styles.tornRouteResetText}>{interaction.resetLabel ?? "Temizle"}</Text>
        </Pressable>
        <Pressable
          style={[styles.tornRouteSubmitBtn, selected.length !== max && styles.tornRouteSubmitBtnDisabled]}
          onPress={submit}
          disabled={selected.length !== max}
        >
          <Text style={styles.tornRouteSubmitText}>{interaction.submitLabel ?? "Rotayı Doğrula"}</Text>
        </Pressable>
      </View>
      <Pressable
        style={[styles.tornRouteHintBtn, hintRevealed && styles.tornRouteHintBtnUsed]}
        onPress={handleHint}
        disabled={hintRevealed}
      >
        <Text style={styles.tornRouteHintText}>
          {hintRevealed ? "İpucu açıldı" : "İpucu iste (-60 sn)"}
        </Text>
      </Pressable>
      {hintRevealed && (
        <View style={styles.tornRouteHintReveal}>
          <Text style={styles.tornRouteHintRevealText}>{sifre.cozumIpucu}</Text>
        </View>
      )}
      {result && (
        <View style={[styles.tornRouteResult, result.ok ? styles.tornRouteResultOk : styles.tornRouteResultFail]}>
          <Text style={[styles.tornRouteResultText, result.ok ? styles.tornRouteResultTextOk : styles.tornRouteResultTextFail]}>
            {result.ok ? "✓ " : "✕ "}{result.message}
          </Text>
        </View>
      )}
      {result?.ok && (
        <View style={styles.tornRouteRouteResult}>
          <Text style={styles.tornRouteRouteResultLabel}>TAMAMLANAN ROTA</Text>
          <Text style={styles.tornRouteRouteResultText}>
            {String((p as Record<string, unknown>).routeResult ?? "")}
          </Text>
        </View>
      )}
    </View>
  );
}

function BrokenCompassCalibrationBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const p = sifre.presentation ?? {};
  const pr = p as Record<string, unknown>;
  const segments = Array.isArray(pr.segments)
    ? (pr.segments as Array<{ id: string; label: string; metal: string; marks: string[]; initialRotation: number; innerRune?: string; leftNotch?: string; rightNotch?: string }>)
    : [];
  const slots = Array.isArray(pr.slots)
    ? (pr.slots as Array<{ id: string; label: string; requiredMark: string }>)
    : [];
  const correctPlacement = Array.isArray(pr.correctPlacement)
    ? (pr.correctPlacement as Array<{ segmentId: string; slotId: string; rotation: number }>)
    : [];
  const interaction: Record<string, string> = (pr.interaction as Record<string, string>) ?? {};

  const initialRotations = React.useMemo(
    () => Object.fromEntries(segments.map(s => [s.id, ((Number(s.initialRotation ?? 0) % 360) + 360) % 360])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [order, setOrder] = React.useState<string[]>([]);
  const [rotations, setRotations] = React.useState<Record<string, number>>(initialRotations);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [hintRevealed, setHintRevealed] = React.useState(false);

  const normRot = (v: number) => ((v % 360) + 360) % 360;

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="explore" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Pusula Kalibre Edildi!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{String(pr.routeResult ?? "")}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  const toggle = (id: string) => {
    setResult(null);
    setOrder(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : prev.length < slots.length ? [...prev, id] : prev
    );
  };

  const rotate = (id: string, delta: number) => {
    setResult(null);
    setRotations(prev => ({ ...prev, [id]: normRot((prev[id] ?? 0) + delta) }));
  };

  const reset = () => {
    setOrder([]);
    setRotations(initialRotations);
    setResult(null);
  };

  const submit = () => {
    const ok =
      order.length === slots.length &&
      correctPlacement.every((need, i) =>
        need.slotId === slots[i]?.id &&
        need.segmentId === order[i] &&
        normRot(rotations[need.segmentId] ?? 0) === normRot(need.rotation)
      );
    const message = ok
      ? (interaction.successMessage ?? "İç halka kapandı.")
      : (interaction.failureMessage ?? "Halka henüz kapanmadı.");
    setResult({ ok, message });
    if (ok) onSolve();
  };

  const handleHint = () => {
    if (hintRevealed) return;
    addTimePenalty(60);
    setHintRevealed(true);
  };

  return (
    <View style={styles.compassBlock}>
      <View style={styles.compassHeader}>
        <MaterialIcons name="explore" size={14} color="#D4A843" />
        <Text style={styles.compassHeaderText}>
          {String(pr.title ?? "KIRIK PUSULA KALİBRASYONU")}
        </Text>
      </View>
      {pr.purposeHint ? (
        <View style={styles.compassPurposeHint}>
          <Text style={styles.compassPurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.compassPurposeText}>{String(pr.purposeHint)}</Text>
        </View>
      ) : null}
      <View style={styles.compassNorthKey}>
        <Text style={styles.compassNorthKeyLabel}>{String(pr.sceneLabel ?? "SEYRÜSEFER KAYDI")}</Text>
        <Text style={styles.compassNorthKeyText}>{String(pr.northKey ?? "")}</Text>
      </View>
      {pr.subtitle ? (
        <Text style={styles.compassSubtitle}>{String(pr.subtitle)}</Text>
      ) : null}
      <Text style={styles.compassSectionLabel}>KADRAN PALETİ</Text>
      <View style={styles.compassSegmentsGrid}>
        {segments.map(seg => {
          const pos = order.indexOf(seg.id);
          const isSelected = pos >= 0;
          const rot = normRot(rotations[seg.id] ?? 0);
          const isKrom = seg.metal === "krom";
          return (
            <Pressable
              key={seg.id}
              style={[
                styles.compassSegment,
                isKrom ? styles.compassSegmentKrom : styles.compassSegmentBakir,
                isSelected && styles.compassSegmentSelected,
              ]}
              onPress={() => toggle(seg.id)}
            >
              <View style={styles.compassSegTopRow}>
                <Text style={styles.compassSegNotch}>{seg.leftNotch ?? ""}</Text>
                <Text style={styles.compassSegLabel}>{seg.label}</Text>
                <Text style={styles.compassSegNotch}>{seg.rightNotch ?? ""}</Text>
              </View>
              <View style={styles.compassFaceWrap}>
                <View style={[styles.compassFace, isKrom ? styles.compassFaceKrom : styles.compassFaceBakir]}>
                  <Text style={styles.compassFaceTop}>{seg.marks?.[0] ?? "·"}</Text>
                  <View style={styles.compassFaceMid}>
                    <Text style={styles.compassFaceSide}>{seg.marks?.[3] ?? "·"}</Text>
                    <Text style={styles.compassFaceCenter}>{seg.innerRune ?? "·"}</Text>
                    <Text style={styles.compassFaceSide}>{seg.marks?.[1] ?? "·"}</Text>
                  </View>
                  <Text style={styles.compassFaceBottom}>{seg.marks?.[2] ?? "·"}</Text>
                  <Text style={styles.compassFaceRot}>{rot}°</Text>
                </View>
              </View>
              {isSelected && (
                <View style={styles.compassPosBadge}>
                  <Text style={styles.compassPosBadgeText}>{pos + 1}</Text>
                </View>
              )}
              {isSelected && (
                <View style={styles.compassRotRow}>
                  <Pressable style={styles.compassRotBtn} onPress={() => rotate(seg.id, -90)}>
                    <Text style={styles.compassRotBtnText}>↶ 90°</Text>
                  </Pressable>
                  <Pressable style={styles.compassRotBtn} onPress={() => rotate(seg.id, 90)}>
                    <Text style={styles.compassRotBtnText}>↷ 90°</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.compassSectionLabel}>YÖN YUVALARI</Text>
      <View style={styles.compassSlotsGrid}>
        {slots.map((slot, i) => {
          const seg = segments.find(s => s.id === order[i]);
          return (
            <View
              key={slot.id}
              style={[styles.compassSlot, seg ? styles.compassSlotFilled : styles.compassSlotEmpty]}
            >
              <Text style={styles.compassSlotLabel}>{slot.label}</Text>
              <Text style={styles.compassSlotMark}>{slot.requiredMark}</Text>
              {seg ? (
                <Text style={styles.compassSlotSegLabel}>{seg.label}</Text>
              ) : (
                <Text style={styles.compassSlotPlaceholder}>Kadran seç</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.compassBtnRow}>
        <Pressable style={styles.compassResetBtn} onPress={reset}>
          <Text style={styles.compassResetText}>{interaction.resetLabel ?? "Kalibrasyonu Temizle"}</Text>
        </Pressable>
        <Pressable
          style={[styles.compassSubmitBtn, order.length !== slots.length && styles.compassSubmitBtnDisabled]}
          onPress={submit}
          disabled={order.length !== slots.length}
        >
          <Text style={styles.compassSubmitText}>{interaction.submitLabel ?? "Pusulayı Kalibre Et"}</Text>
        </Pressable>
      </View>
      <Pressable
        style={[styles.compassHintBtn, hintRevealed && styles.compassHintBtnUsed]}
        onPress={handleHint}
        disabled={hintRevealed}
      >
        <Text style={styles.compassHintText}>
          {hintRevealed ? "İpucu açıldı" : "İpucu iste (-60 sn)"}
        </Text>
      </Pressable>
      {hintRevealed && (
        <View style={styles.compassHintReveal}>
          <Text style={styles.compassHintRevealText}>{sifre.cozumIpucu}</Text>
        </View>
      )}
      {result && (
        <View style={[styles.compassResult, result.ok ? styles.compassResultOk : styles.compassResultFail]}>
          <Text style={[styles.compassResultText, result.ok ? styles.compassResultTextOk : styles.compassResultTextFail]}>
            {result.ok ? "✓ " : "✕ "}{result.message}
          </Text>
        </View>
      )}
      {result?.ok && (
        <View style={styles.compassRouteResult}>
          <Text style={styles.compassRouteResultLabel}>OKUNAN ROTA NOTU</Text>
          <Text style={styles.compassRouteResultText}>{String(pr.routeResult ?? "")}</Text>
        </View>
      )}
      {result?.ok && sifre.aciklama ? (
        <Text style={styles.compassAciklama}>{sifre.aciklama}</Text>
      ) : null}
    </View>
  );
}

function LuggageLabelMatchBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const p = sifre.presentation ?? {};
  const pr = p as Record<string, unknown>;
  const cases = Array.isArray(pr.cases)
    ? (pr.cases as Array<{ id: string; label: string; stamp: string; note: string }>)
    : [];
  const routes = Array.isArray(pr.routes)
    ? (pr.routes as Array<{ id: string; label: string }>)
    : [];
  const correctAssignments = Array.isArray(pr.correctAssignments)
    ? (pr.correctAssignments as Array<{ itemId: string; answerId: string }>)
    : [];
  const interaction: Record<string, string> = (pr.interaction as Record<string, string>) ?? {};

  const [choices, setChoices] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [hintRevealed, setHintRevealed] = React.useState(false);

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="luggage" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Etiketler Doğrulandı!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{String(pr.resultText ?? "")}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  const setChoice = (itemId: string, answerId: string) => {
    setResult(null);
    setChoices(prev => ({ ...prev, [itemId]: answerId }));
  };

  const allAssigned = cases.length > 0 && cases.every(c => !!choices[c.id]);

  const submit = () => {
    const ok = correctAssignments.every(a => choices[a.itemId] === a.answerId);
    const message = ok
      ? (interaction.successMessage ?? "Etiket zinciri doğrulandı.")
      : (interaction.failureMessage ?? "Damga sırası aynı yolculuğu anlatmıyor.");
    setResult({ ok, message });
    if (ok) onSolve();
  };

  const handleHint = () => {
    if (hintRevealed) return;
    addTimePenalty(60);
    setHintRevealed(true);
  };

  return (
    <View style={styles.luggageBlock}>
      <View style={styles.luggageHeader}>
        <MaterialIcons name="luggage" size={14} color="#D4A843" />
        <Text style={styles.luggageHeaderText}>
          {String(pr.title ?? "VALİZ ETİKETİ EŞLEME")}
        </Text>
      </View>
      {pr.purposeHint ? (
        <View style={styles.luggagePurposeHint}>
          <Text style={styles.luggagePurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.luggagePurposeText}>{String(pr.purposeHint)}</Text>
        </View>
      ) : null}
      {pr.subtitle ? (
        <Text style={styles.luggageSubtitle}>{String(pr.subtitle)}</Text>
      ) : null}
      <View style={styles.luggageCasesGrid}>
        {cases.map(item => {
          const selected = choices[item.id];
          return (
            <View key={item.id} style={styles.luggageCaseCard}>
              <Text style={styles.luggageCaseLabel}>{item.label}</Text>
              <Text style={styles.luggageCaseStamp}>{item.stamp}</Text>
              <Text style={styles.luggageCaseNote}>{item.note}</Text>
              <View style={styles.luggageRouteList}>
                {routes.map(route => {
                  const isChosen = selected === route.id;
                  return (
                    <Pressable
                      key={route.id}
                      style={[styles.luggageRouteOption, isChosen && styles.luggageRouteOptionSelected]}
                      onPress={() => setChoice(item.id, route.id)}
                    >
                      <View style={[styles.luggageRadio, isChosen && styles.luggageRadioSelected]}>
                        {isChosen && <View style={styles.luggageRadioDot} />}
                      </View>
                      <Text style={[styles.luggageRouteLabel, isChosen && styles.luggageRouteLabelSelected]}>
                        {route.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
      <Pressable
        style={[styles.luggageSubmitBtn, !allAssigned && styles.luggageSubmitBtnDisabled]}
        onPress={submit}
        disabled={!allAssigned}
      >
        <Text style={styles.luggageSubmitText}>{interaction.submitLabel ?? "Etiketleri Doğrula"}</Text>
      </Pressable>
      <Pressable
        style={[styles.luggageHintBtn, hintRevealed && styles.luggageHintBtnUsed]}
        onPress={handleHint}
        disabled={hintRevealed}
      >
        <Text style={styles.luggageHintText}>
          {hintRevealed ? "İpucu açıldı" : "İpucu iste (-60 sn)"}
        </Text>
      </Pressable>
      {hintRevealed && (
        <View style={styles.luggageHintReveal}>
          <Text style={styles.luggageHintRevealText}>{sifre.cozumIpucu}</Text>
        </View>
      )}
      {result && (
        <View style={[styles.luggageResult, result.ok ? styles.luggageResultOk : styles.luggageResultFail]}>
          <Text style={[styles.luggageResultText, result.ok ? styles.luggageResultTextOk : styles.luggageResultTextFail]}>
            {result.ok ? "✓ " : "✕ "}{result.message}
          </Text>
        </View>
      )}
      {result?.ok && (
        <View style={styles.luggageGridEffect}>
          <Text style={styles.luggageGridEffectLabel}>IZGARA ETKİSİ</Text>
          <Text style={styles.luggageGridEffectText}>{String(pr.resultText ?? "")}</Text>
        </View>
      )}
      {result?.ok && sifre.aciklama ? (
        <Text style={styles.luggageAciklama}>{sifre.aciklama}</Text>
      ) : null}
    </View>
  );
}

function NegativeContactSheetBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const p = sifre.presentation ?? {};
  const pr = p as Record<string, unknown>;
  const checks = Array.isArray(pr.checks)
    ? (pr.checks as Array<{ id: string; label: string; positive: string; negative: string; options: Array<{ id: string; label: string }> }>)
    : [];
  const correctAssignments = Array.isArray(pr.correctAssignments)
    ? (pr.correctAssignments as Array<{ itemId: string; answerId: string }>)
    : [];
  const interaction: Record<string, string> = (pr.interaction as Record<string, string>) ?? {};

  const [choices, setChoices] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [hintRevealed, setHintRevealed] = React.useState(false);

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="photo-camera" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Negatifler Karşılaştırıldı!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{String(pr.resultText ?? "")}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  const setChoice = (itemId: string, answerId: string) => {
    setResult(null);
    setChoices(prev => ({ ...prev, [itemId]: answerId }));
  };

  const allAssigned = checks.length > 0 && checks.every(c => !!choices[c.id]);

  const submit = () => {
    const ok = correctAssignments.every(a => choices[a.itemId] === a.answerId);
    const message = ok
      ? (interaction.successMessage ?? "Negatifler aynı fiziksel hikâyeyi anlattı.")
      : (interaction.failureMessage ?? "Seçtiğin farklar tek bir sahnede birlikte mümkün görünmüyor.");
    setResult({ ok, message });
    if (ok) onSolve();
  };

  const handleHint = () => {
    if (hintRevealed) return;
    addTimePenalty(60);
    setHintRevealed(true);
  };

  return (
    <View style={styles.negativeBlock}>
      <View style={styles.negativeHeader}>
        <MaterialIcons name="photo-camera" size={14} color="#D4A843" />
        <Text style={styles.negativeHeaderText}>
          {String(pr.title ?? "NEGATİF KARŞILAŞTIRMA")}
        </Text>
      </View>
      {pr.purposeHint ? (
        <View style={styles.negativePurposeHint}>
          <Text style={styles.negativePurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.negativePurposeText}>{String(pr.purposeHint)}</Text>
        </View>
      ) : null}
      {pr.subtitle ? (
        <Text style={styles.negativeSubtitle}>{String(pr.subtitle)}</Text>
      ) : null}
      <View style={styles.negativeChecksGrid}>
        {checks.map(item => {
          const selected = choices[item.id];
          return (
            <View key={item.id} style={styles.negativeCheckCard}>
              <Text style={styles.negativeCheckLabel}>{item.label}</Text>
              <View style={styles.negativePhotoPair}>
                <View style={styles.negativePositiveCell}>
                  <Text style={styles.negativePhotoCellLabel}>POZİTİF</Text>
                  <Text style={styles.negativePositiveText}>{item.positive}</Text>
                </View>
                <View style={styles.negativeNegativeCell}>
                  <Text style={styles.negativePhotoCellLabel}>NEGATİF</Text>
                  <Text style={styles.negativeNegativeText}>{item.negative}</Text>
                </View>
              </View>
              <View style={styles.negativeOptionList}>
                {item.options.map(opt => {
                  const isChosen = selected === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.negativeOption, isChosen && styles.negativeOptionSelected]}
                      onPress={() => setChoice(item.id, opt.id)}
                    >
                      <View style={[styles.negativeRadio, isChosen && styles.negativeRadioSelected]}>
                        {isChosen && <View style={styles.negativeRadioDot} />}
                      </View>
                      <Text style={[styles.negativeOptionLabel, isChosen && styles.negativeOptionLabelSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
      <Pressable
        style={[styles.negativeSubmitBtn, !allAssigned && styles.negativeSubmitBtnDisabled]}
        onPress={submit}
        disabled={!allAssigned}
      >
        <Text style={styles.negativeSubmitText}>{interaction.submitLabel ?? "Baskıları Karşılaştır"}</Text>
      </Pressable>
      <Pressable
        style={[styles.negativeHintBtn, hintRevealed && styles.negativeHintBtnUsed]}
        onPress={handleHint}
        disabled={hintRevealed}
      >
        <Text style={styles.negativeHintText}>
          {hintRevealed ? "İpucu açıldı" : "İpucu iste (-60 sn)"}
        </Text>
      </Pressable>
      {hintRevealed && (
        <View style={styles.negativeHintReveal}>
          <Text style={styles.negativeHintRevealText}>{sifre.cozumIpucu}</Text>
        </View>
      )}
      {result && (
        <View style={[styles.negativeResult, result.ok ? styles.negativeResultOk : styles.negativeResultFail]}>
          <Text style={[styles.negativeResultText, result.ok ? styles.negativeResultTextOk : styles.negativeResultTextFail]}>
            {result.ok ? "✓ " : "✕ "}{result.message}
          </Text>
        </View>
      )}
      {result?.ok && (
        <View style={styles.negativeGridEffect}>
          <Text style={styles.negativeGridEffectLabel}>IZGARA ETKİSİ</Text>
          <Text style={styles.negativeGridEffectText}>{String(pr.resultText ?? "")}</Text>
        </View>
      )}
      {result?.ok && sifre.aciklama ? (
        <Text style={styles.negativeAciklama}>{sifre.aciklama}</Text>
      ) : null}
    </View>
  );
}

function MorseTransceiverBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const p = sifre.presentation ?? {};
  const pr = p as Record<string, unknown>;
  const chart = Array.isArray(pr.chart)
    ? (pr.chart as Array<{ char: string; code: string }>)
    : [];
  const signals = Array.isArray(pr.signals)
    ? (pr.signals as Array<{ id: string; label: string; code: string; options: string[] }>)
    : [];
  const correctAssignments = Array.isArray(pr.correctAssignments)
    ? (pr.correctAssignments as Array<{ itemId: string; answerId: string }>)
    : [];
  const interaction: Record<string, string> = (pr.interaction as Record<string, string>) ?? {};

  const [choices, setChoices] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [hintRevealed, setHintRevealed] = React.useState(false);

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="radio" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Mors Kesiti Çözüldü!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{String(pr.resultText ?? "")}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  const setChoice = (itemId: string, answerId: string) => {
    setResult(null);
    setChoices(prev => ({ ...prev, [itemId]: answerId }));
  };

  const allAssigned = signals.length > 0 && signals.every(s => !!choices[s.id]);

  const submit = () => {
    const ok = correctAssignments.every(a => choices[a.itemId] === a.answerId);
    const message = ok
      ? (interaction.successMessage ?? "Kesit, bakım anahtarıyla aynı kelimeyi verdi.")
      : (interaction.failureMessage ?? "Harfler sabit vuruş dizisine uymuyor.");
    setResult({ ok, message });
    if (ok) onSolve();
  };

  const handleHint = () => {
    if (hintRevealed) return;
    addTimePenalty(60);
    setHintRevealed(true);
  };

  return (
    <View style={styles.morseBlock}>
      <View style={styles.morseHeader}>
        <MaterialIcons name="radio" size={14} color="#D4A843" />
        <Text style={styles.morseHeaderText}>
          {String(pr.title ?? "MORS / TELSİZ KESİTİ")}
        </Text>
      </View>
      {pr.purposeHint ? (
        <View style={styles.morsePurposeHint}>
          <Text style={styles.morsePurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.morsePurposeText}>{String(pr.purposeHint)}</Text>
        </View>
      ) : null}
      {pr.subtitle ? (
        <Text style={styles.morseSubtitle}>{String(pr.subtitle)}</Text>
      ) : null}
      <View style={styles.morseChartWrap}>
        <Text style={styles.morseChartLabel}>MORS TABLOSU</Text>
        <View style={styles.morseChartRow}>
          {chart.map(entry => (
            <View key={entry.char} style={styles.morseChartEntry}>
              <Text style={styles.morseChartChar}>{entry.char}</Text>
              <Text style={styles.morseChartCode}>{entry.code}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.morseSignalsList}>
        {signals.map(signal => {
          const selected = choices[signal.id];
          return (
            <View key={signal.id} style={styles.morseSignalCard}>
              <Text style={styles.morseSignalLabel}>{signal.label}</Text>
              <Text style={styles.morseSignalCode}>{signal.code}</Text>
              <View style={styles.morseOptionRow}>
                {signal.options.map(opt => {
                  const isChosen = selected === opt;
                  return (
                    <Pressable
                      key={opt}
                      style={[styles.morseOptionBtn, isChosen && styles.morseOptionBtnSelected]}
                      onPress={() => setChoice(signal.id, opt)}
                    >
                      <Text style={[styles.morseOptionChar, isChosen && styles.morseOptionCharSelected]}>
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
      <Pressable
        style={[styles.morseSubmitBtn, !allAssigned && styles.morseSubmitBtnDisabled]}
        onPress={submit}
        disabled={!allAssigned}
      >
        <Text style={styles.morseSubmitText}>{interaction.submitLabel ?? "Kesiti Doğrula"}</Text>
      </Pressable>
      <Pressable
        style={[styles.morseHintBtn, hintRevealed && styles.morseHintBtnUsed]}
        onPress={handleHint}
        disabled={hintRevealed}
      >
        <Text style={styles.morseHintText}>
          {hintRevealed ? "İpucu açıldı" : "İpucu iste (-60 sn)"}
        </Text>
      </Pressable>
      {hintRevealed && (
        <View style={styles.morseHintReveal}>
          <Text style={styles.morseHintRevealText}>{sifre.cozumIpucu}</Text>
        </View>
      )}
      {result && (
        <View style={[styles.morseResult, result.ok ? styles.morseResultOk : styles.morseResultFail]}>
          <Text style={[styles.morseResultText, result.ok ? styles.morseResultTextOk : styles.morseResultTextFail]}>
            {result.ok ? "✓ " : "✕ "}{result.message}
          </Text>
        </View>
      )}
      {result?.ok && (
        <View style={styles.morseGridEffect}>
          <Text style={styles.morseGridEffectLabel}>IZGARA ETKİSİ</Text>
          <Text style={styles.morseGridEffectText}>{String(pr.resultText ?? "")}</Text>
        </View>
      )}
      {result?.ok && sifre.aciklama ? (
        <Text style={styles.morseAciklama}>{sifre.aciklama}</Text>
      ) : null}
    </View>
  );
}

function ArchiveIndexReconstructionBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const p = sifre.presentation ?? {};
  const pr = p as Record<string, unknown>;
  const files = Array.isArray(pr.files)
    ? (pr.files as Array<{ id: string; code: string; date: string; note: string }>)
    : [];
  const slots = Array.isArray(pr.slots)
    ? (pr.slots as Array<{ id: string; label: string }>)
    : [];
  const correctAssignments = Array.isArray(pr.correctAssignments)
    ? (pr.correctAssignments as Array<{ itemId: string; answerId: string }>)
    : [];
  const interaction: Record<string, string> = (pr.interaction as Record<string, string>) ?? {};

  const [choices, setChoices] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [hintRevealed, setHintRevealed] = React.useState(false);

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="folder-special" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Arşiv Dizini Kuruldu!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{String(pr.resultText ?? "")}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  const setChoice = (fileId: string, slotId: string) => {
    setResult(null);
    setChoices(prev => ({ ...prev, [fileId]: slotId }));
  };

  const allAssigned = files.length > 0 && files.every(f => !!choices[f.id]);

  const submit = () => {
    const ok = correctAssignments.every(a => choices[a.itemId] === a.answerId);
    const message = ok
      ? (interaction.successMessage ?? "Dosyalar kendi raflarına döndü.")
      : (interaction.failureMessage ?? "Tarih ve kod aynı raf düzenini vermiyor.");
    setResult({ ok, message });
    if (ok) onSolve();
  };

  const handleHint = () => {
    if (hintRevealed) return;
    addTimePenalty(60);
    setHintRevealed(true);
  };

  return (
    <View style={styles.archiveBlock}>
      <View style={styles.archiveHeader}>
        <MaterialIcons name="folder-special" size={14} color="#D4A843" />
        <Text style={styles.archiveHeaderText}>
          {String(pr.title ?? "ARŞİV DİZİNİ")}
        </Text>
      </View>
      {pr.purposeHint ? (
        <View style={styles.archivePurposeHint}>
          <Text style={styles.archivePurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.archivePurposeText}>{String(pr.purposeHint)}</Text>
        </View>
      ) : null}
      {pr.subtitle ? (
        <Text style={styles.archiveSubtitle}>{String(pr.subtitle)}</Text>
      ) : null}
      <View style={styles.archiveFileList}>
        {files.map(file => {
          const selected = choices[file.id];
          return (
            <View key={file.id} style={styles.archiveFileCard}>
              <View style={styles.archiveFileTop}>
                <Text style={styles.archiveFileCode}>{file.code}</Text>
                <Text style={styles.archiveFileDate}>{file.date}</Text>
              </View>
              <Text style={styles.archiveFileNote}>{file.note}</Text>
              <View style={styles.archiveSlotList}>
                {slots.map(slot => {
                  const isChosen = selected === slot.id;
                  return (
                    <Pressable
                      key={slot.id}
                      style={[styles.archiveSlotOption, isChosen && styles.archiveSlotOptionSelected]}
                      onPress={() => setChoice(file.id, slot.id)}
                    >
                      <View style={[styles.archiveSlotRadio, isChosen && styles.archiveSlotRadioSelected]}>
                        {isChosen && <View style={styles.archiveSlotRadioDot} />}
                      </View>
                      <Text style={[styles.archiveSlotLabel, isChosen && styles.archiveSlotLabelSelected]}>
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
      <Pressable
        style={[styles.archiveSubmitBtn, !allAssigned && styles.archiveSubmitBtnDisabled]}
        onPress={submit}
        disabled={!allAssigned}
      >
        <Text style={styles.archiveSubmitText}>{interaction.submitLabel ?? "Dizini Kur"}</Text>
      </Pressable>
      <Pressable
        style={[styles.archiveHintBtn, hintRevealed && styles.archiveHintBtnUsed]}
        onPress={handleHint}
        disabled={hintRevealed}
      >
        <Text style={styles.archiveHintText}>
          {hintRevealed ? "İpucu açıldı" : "İpucu iste (-60 sn)"}
        </Text>
      </Pressable>
      {hintRevealed && (
        <View style={styles.archiveHintReveal}>
          <Text style={styles.archiveHintRevealText}>{sifre.cozumIpucu}</Text>
        </View>
      )}
      {result && (
        <View style={[styles.archiveResult, result.ok ? styles.archiveResultOk : styles.archiveResultFail]}>
          <Text style={[styles.archiveResultText, result.ok ? styles.archiveResultTextOk : styles.archiveResultTextFail]}>
            {result.ok ? "✓ " : "✕ "}{result.message}
          </Text>
        </View>
      )}
      {result?.ok && (
        <View style={styles.archiveGridEffect}>
          <Text style={styles.archiveGridEffectLabel}>IZGARA ETKİSİ</Text>
          <Text style={styles.archiveGridEffectText}>{String(pr.resultText ?? "")}</Text>
        </View>
      )}
      {result?.ok && sifre.aciklama ? (
        <Text style={styles.archiveAciklama}>{sifre.aciklama}</Text>
      ) : null}
    </View>
  );
}

function MechanicalLockSequenceBlock({
  sifre,
  isSolved,
  onSolve,
}: {
  sifre: ClueSifre;
  isSolved: boolean;
  onSolve: () => void;
}) {
  const { addTimePenalty } = useGame();
  const p = sifre.presentation ?? {};
  const pr = p as Record<string, unknown>;
  const dialDefs = Array.isArray(pr.dials)
    ? (pr.dials as Array<{ id: string; label: string; symbols: string[]; initial?: string }>)
    : [];
  const correctCode = Array.isArray(pr.correctCode)
    ? (pr.correctCode as Array<{ dialId: string; symbol: string }>)
    : [];
  const interaction: Record<string, string> = (pr.interaction as Record<string, string>) ?? {};

  const [dialValues, setDialValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(dialDefs.map(d => [d.id, d.initial ?? d.symbols?.[0] ?? ""]))
  );
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [hintRevealed, setHintRevealed] = React.useState(false);

  if (isSolved) {
    return (
      <View style={styles.miniGameSolvedBlock}>
        <MaterialIcons name="lock-open" size={20} color="#22c55e" />
        <Text style={styles.miniGameSolvedText}>Kilit Açıldı!</Text>
        <View style={styles.miniGameAnswer}>
          <Text style={styles.miniGameAnswerText}>{String(pr.resultText ?? "")}</Text>
        </View>
        <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
      </View>
    );
  }

  const rotate = (dial: { id: string; symbols: string[] }, delta: number) => {
    setResult(null);
    const syms = dial.symbols ?? [];
    const cur = dialValues[dial.id] ?? syms[0];
    const idx = Math.max(0, syms.indexOf(cur));
    const next = syms[(idx + delta + syms.length) % syms.length];
    setDialValues(prev => ({ ...prev, [dial.id]: next }));
  };

  const submit = () => {
    const ok = correctCode.length > 0 && correctCode.every(e => dialValues[e.dialId] === e.symbol);
    const message = ok
      ? (interaction.successMessage ?? "Dört kadran aynı sefer kaydına oturdu.")
      : (interaction.failureMessage ?? "Kadranlar aynı tekrar dizisini vermiyor.");
    setResult({ ok, message });
    if (ok) onSolve();
  };

  const handleHint = () => {
    if (hintRevealed) return;
    addTimePenalty(60);
    setHintRevealed(true);
  };

  return (
    <View style={styles.lockBlock}>
      <View style={styles.lockHeader}>
        <MaterialIcons name="lock" size={14} color="#D4A843" />
        <Text style={styles.lockHeaderText}>
          {String(pr.title ?? "MEKANİK KİLİT DİZİSİ")}
        </Text>
      </View>
      {pr.purposeHint ? (
        <View style={styles.lockPurposeHint}>
          <Text style={styles.lockPurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.lockPurposeText}>{String(pr.purposeHint)}</Text>
        </View>
      ) : null}
      {pr.subtitle ? (
        <Text style={styles.lockSubtitle}>{String(pr.subtitle)}</Text>
      ) : null}
      <View style={styles.lockDialGrid}>
        {dialDefs.map(dial => {
          const cur = dialValues[dial.id] ?? dial.symbols?.[0] ?? "";
          return (
            <View key={dial.id} style={styles.lockDialCard}>
              <Text style={styles.lockDialLabel}>{dial.label}</Text>
              <View style={styles.lockDialFace}>
                <Text style={styles.lockDialSymbol}>{cur}</Text>
              </View>
              <View style={styles.lockDialControls}>
                <Pressable
                  style={styles.lockRotateBtn}
                  onPress={() => rotate(dial, -1)}
                >
                  <Text style={styles.lockRotateText}>↺</Text>
                </Pressable>
                <Pressable
                  style={styles.lockRotateBtn}
                  onPress={() => rotate(dial, 1)}
                >
                  <Text style={styles.lockRotateText}>↻</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
      <Pressable style={styles.lockSubmitBtn} onPress={submit}>
        <Text style={styles.lockSubmitText}>{interaction.submitLabel ?? "Kilidi Aç"}</Text>
      </Pressable>
      <Pressable
        style={[styles.lockHintBtn, hintRevealed && styles.lockHintBtnUsed]}
        onPress={handleHint}
        disabled={hintRevealed}
      >
        <Text style={styles.lockHintText}>
          {hintRevealed ? "İpucu açıldı" : "İpucu iste (-60 sn)"}
        </Text>
      </Pressable>
      {hintRevealed && (
        <View style={styles.lockHintReveal}>
          <Text style={styles.lockHintRevealText}>{sifre.cozumIpucu}</Text>
        </View>
      )}
      {result && (
        <View style={[styles.lockResult, result.ok ? styles.lockResultOk : styles.lockResultFail]}>
          <Text style={[styles.lockResultText, result.ok ? styles.lockResultTextOk : styles.lockResultTextFail]}>
            {result.ok ? "✓ " : "✕ "}{result.message}
          </Text>
        </View>
      )}
      {result?.ok && (
        <View style={styles.lockGridEffect}>
          <Text style={styles.lockGridEffectLabel}>IZGARA ETKİSİ</Text>
          <Text style={styles.lockGridEffectText}>{String(pr.resultText ?? "")}</Text>
        </View>
      )}
      {result?.ok && sifre.aciklama ? (
        <Text style={styles.lockAciklama}>{sifre.aciklama}</Text>
      ) : null}
    </View>
  );
}

function CipherDiscAlignmentBlock({ sifre, isSolved, onSolve }: { sifre: ClueSifre; isSolved: boolean; onSolve: () => void }) {
  const pres = sifre.presentation!;
  const discs = (pres as Record<string, unknown>).discs as Array<{ id: string; label: string; symbols: string[]; initial: string }>;
  const correctCode = (pres as Record<string, unknown>).correctCode as Array<{ discId: string; symbol: string }>;
  const { addTimePenalty } = useGame();
  const [positions, setPositions] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    discs.forEach(d => { init[d.id] = Math.max(0, d.symbols.indexOf(d.initial)); });
    return init;
  });
  const [wrong, setWrong] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);

  const rotate = (discId: string, dir: number) => {
    const disc = discs.find(d => d.id === discId)!;
    setPositions(prev => ({ ...prev, [discId]: (prev[discId] + dir + disc.symbols.length) % disc.symbols.length }));
  };
  const handleSubmit = () => {
    const ok = correctCode.every(c => {
      const disc = discs.find(d => d.id === c.discId)!;
      return disc.symbols[positions[c.discId]] === c.symbol;
    });
    if (ok) { onSolve(); } else { setWrong(true); setTimeout(() => setWrong(false), 2000); }
  };
  const handleHint = () => { if (hintRevealed) return; setHintRevealed(true); addTimePenalty(60); };

  if (isSolved) return (
    <View style={styles.miniGameSolvedBlock}>
      <MaterialIcons name="check-circle" size={20} color="#22c55e" />
      <Text style={styles.miniGameSolvedText}>{(pres.interaction as Record<string,string>)?.successMessage ?? "Çözüldü!"}</Text>
      <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
    </View>
  );

  return (
    <View style={styles.discContainer}>
      <Text style={styles.discTitle}>{pres.title}</Text>
      <Text style={styles.discSubtitle}>{pres.subtitle}</Text>
      <Text style={styles.discPurposeHint}>{(pres as Record<string,string>).purposeHint}</Text>
      {discs.map(disc => (
        <View key={disc.id} style={styles.discRow}>
          <Text style={styles.discLabel}>{disc.label}</Text>
          <View style={styles.discControl}>
            <Pressable style={styles.discArrow} onPress={() => rotate(disc.id, -1)}>
              <MaterialIcons name="chevron-left" size={24} color="#D4A843" />
            </Pressable>
            <View style={styles.discSymbolBox}>
              <Text style={styles.discSymbol}>{disc.symbols[positions[disc.id]]}</Text>
            </View>
            <Pressable style={styles.discArrow} onPress={() => rotate(disc.id, 1)}>
              <MaterialIcons name="chevron-right" size={24} color="#D4A843" />
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable style={styles.fenSubmitBtn} onPress={handleSubmit}>
        <Text style={styles.fenSubmitText}>{(pres.interaction as Record<string,string>)?.submitLabel ?? "Hizala"}</Text>
      </Pressable>
      {wrong && <View style={[styles.lockResult, styles.lockResultFail]}><Text style={[styles.lockResultText, styles.lockResultTextFail]}>{(pres.interaction as Record<string,string>)?.failureMessage ?? "Yanlış."}</Text></View>}
      <Pressable style={[styles.lockHintBtn, hintRevealed && styles.lockHintBtnUsed]} onPress={handleHint} disabled={hintRevealed}>
        <Text style={styles.lockHintText}>{hintRevealed ? "İpucu Kullanıldı (−60 sn)" : "İpucu Al (−60 sn)"}</Text>
      </Pressable>
      {hintRevealed && <View style={styles.lockHintReveal}><Text style={styles.lockHintRevealText}>{sifre.cozumIpucu}</Text></View>}
    </View>
  );
}

function TimelineBoardBlock({ sifre, isSolved, onSolve }: { sifre: ClueSifre; isSolved: boolean; onSolve: () => void }) {
  const pres = sifre.presentation!;
  const events = (pres as Record<string, unknown>).events as Array<{ id: string; label: string; text: string }>;
  const correctOrder = (pres as Record<string, unknown>).correctOrder as string[];
  const { addTimePenalty } = useGame();
  const [order, setOrder] = useState<string[]>(() => events.map(e => e.id));
  const [wrong, setWrong] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);

  const move = (idx: number, dir: number) => {
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  };
  const handleSubmit = () => {
    if (correctOrder.every((id, i) => order[i] === id)) { onSolve(); }
    else { setWrong(true); setTimeout(() => setWrong(false), 2000); }
  };
  const handleHint = () => { if (hintRevealed) return; setHintRevealed(true); addTimePenalty(60); };

  if (isSolved) return (
    <View style={styles.miniGameSolvedBlock}>
      <MaterialIcons name="check-circle" size={20} color="#22c55e" />
      <Text style={styles.miniGameSolvedText}>{(pres.interaction as Record<string,string>)?.successMessage ?? "Çözüldü!"}</Text>
      <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
    </View>
  );

  return (
    <View style={styles.tlContainer}>
      <Text style={styles.tlTitle}>{pres.title}</Text>
      <Text style={styles.tlSubtitle}>{pres.subtitle}</Text>
      <Text style={styles.tlPurposeHint}>{(pres as Record<string,string>).purposeHint}</Text>
      {order.map((id, idx) => {
        const ev = events.find(e => e.id === id)!;
        return (
          <View key={id} style={styles.tlCard}>
            <View style={styles.tlCardBadge}><Text style={styles.tlCardBadgeText}>{idx + 1}</Text></View>
            <View style={styles.tlCardBody}>
              <Text style={styles.tlCardLabel}>{ev.label}</Text>
              <Text style={styles.tlCardText}>{ev.text}</Text>
            </View>
            <View style={styles.tlCardArrows}>
              <Pressable style={styles.tlArrow} onPress={() => move(idx, -1)} disabled={idx === 0}>
                <MaterialIcons name="arrow-upward" size={18} color={idx === 0 ? "#3a3f55" : "#D4A843"} />
              </Pressable>
              <Pressable style={styles.tlArrow} onPress={() => move(idx, 1)} disabled={idx === order.length - 1}>
                <MaterialIcons name="arrow-downward" size={18} color={idx === order.length - 1 ? "#3a3f55" : "#D4A843"} />
              </Pressable>
            </View>
          </View>
        );
      })}
      <Pressable style={styles.fenSubmitBtn} onPress={handleSubmit}>
        <Text style={styles.fenSubmitText}>{(pres.interaction as Record<string,string>)?.submitLabel ?? "Sırala"}</Text>
      </Pressable>
      {wrong && <View style={[styles.lockResult, styles.lockResultFail]}><Text style={[styles.lockResultText, styles.lockResultTextFail]}>{(pres.interaction as Record<string,string>)?.failureMessage ?? "Yanlış sıra."}</Text></View>}
      <Pressable style={[styles.lockHintBtn, hintRevealed && styles.lockHintBtnUsed]} onPress={handleHint} disabled={hintRevealed}>
        <Text style={styles.lockHintText}>{hintRevealed ? "İpucu Kullanıldı (−60 sn)" : "İpucu Al (−60 sn)"}</Text>
      </Pressable>
      {hintRevealed && <View style={styles.lockHintReveal}><Text style={styles.lockHintRevealText}>{sifre.cozumIpucu}</Text></View>}
    </View>
  );
}

function ParcelXrayLayersBlock({ sifre, isSolved, onSolve }: { sifre: ClueSifre; isSolved: boolean; onSolve: () => void }) {
  const pres = sifre.presentation!;
  const layers = (pres as Record<string, unknown>).layers as Array<{ id: string; label: string; scan: string }>;
  const findings = (pres as Record<string, unknown>).findings as Array<{ id: string; label: string }>;
  const correctAssignments = (pres as Record<string, unknown>).correctAssignments as Array<{ itemId: string; answerId: string }>;
  const { addTimePenalty } = useGame();
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);

  const handleSubmit = () => {
    if (correctAssignments.every(ca => assignments[ca.itemId] === ca.answerId)) { onSolve(); }
    else { setWrong(true); setTimeout(() => setWrong(false), 2000); }
  };
  const handleHint = () => { if (hintRevealed) return; setHintRevealed(true); addTimePenalty(60); };
  const allAssigned = Object.keys(assignments).length >= layers.length;

  if (isSolved) return (
    <View style={styles.miniGameSolvedBlock}>
      <MaterialIcons name="check-circle" size={20} color="#22c55e" />
      <Text style={styles.miniGameSolvedText}>{(pres.interaction as Record<string,string>)?.successMessage ?? "Çözüldü!"}</Text>
      <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
    </View>
  );

  return (
    <View style={styles.xrayContainer}>
      <Text style={styles.xrayTitle}>{pres.title}</Text>
      <Text style={styles.xraySubtitle}>{pres.subtitle}</Text>
      <Text style={styles.xrayPurposeHint}>{(pres as Record<string,string>).purposeHint}</Text>
      {layers.map(layer => {
        const sel = assignments[layer.id];
        return (
          <View key={layer.id} style={styles.xrayLayer}>
            <View style={styles.xrayLayerHeader}>
              <MaterialIcons name="layers" size={13} color="#60a5fa" />
              <Text style={styles.xrayLayerLabel}>{layer.label}</Text>
            </View>
            <Text style={styles.xrayLayerScan}>{layer.scan}</Text>
            <View style={styles.xrayOptions}>
              {findings.map(f => {
                const isSelected = sel === f.id;
                return (
                  <Pressable key={f.id} style={[styles.xrayOption, isSelected && styles.xrayOptionSelected]}
                    onPress={() => setAssignments(prev => ({ ...prev, [layer.id]: f.id }))}>
                    <Text style={[styles.xrayOptionText, isSelected && styles.xrayOptionTextSelected]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      <Pressable style={[styles.fenSubmitBtn, !allAssigned && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!allAssigned}>
        <Text style={styles.fenSubmitText}>{(pres.interaction as Record<string,string>)?.submitLabel ?? "Eşleştir"}</Text>
      </Pressable>
      {wrong && <View style={[styles.lockResult, styles.lockResultFail]}><Text style={[styles.lockResultText, styles.lockResultTextFail]}>{(pres.interaction as Record<string,string>)?.failureMessage ?? "Hatalı eşleşme."}</Text></View>}
      <Pressable style={[styles.lockHintBtn, hintRevealed && styles.lockHintBtnUsed]} onPress={handleHint} disabled={hintRevealed}>
        <Text style={styles.lockHintText}>{hintRevealed ? "İpucu Kullanıldı (−60 sn)" : "İpucu Al (−60 sn)"}</Text>
      </Pressable>
      {hintRevealed && <View style={styles.lockHintReveal}><Text style={styles.lockHintRevealText}>{sifre.cozumIpucu}</Text></View>}
    </View>
  );
}

function WaltzScoreStitchBlock({ sifre, isSolved, onSolve }: { sifre: ClueSifre; isSolved: boolean; onSolve: () => void }) {
  const pres = sifre.presentation!;
  const measures = (pres as Record<string, unknown>).measures as Array<{ id: string; label: string; note: string; options: Array<{ id: string; label: string }> }>;
  const correctAssignments = (pres as Record<string, unknown>).correctAssignments as Array<{ itemId: string; answerId: string }>;
  const { addTimePenalty } = useGame();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);

  const handleSubmit = () => {
    if (correctAssignments.every(ca => selections[ca.itemId] === ca.answerId)) { onSolve(); }
    else { setWrong(true); setTimeout(() => setWrong(false), 2000); }
  };
  const handleHint = () => { if (hintRevealed) return; setHintRevealed(true); addTimePenalty(60); };
  const allSelected = Object.keys(selections).length >= measures.length;

  if (isSolved) return (
    <View style={styles.miniGameSolvedBlock}>
      <MaterialIcons name="check-circle" size={20} color="#22c55e" />
      <Text style={styles.miniGameSolvedText}>{(pres.interaction as Record<string,string>)?.successMessage ?? "Çözüldü!"}</Text>
      <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
    </View>
  );

  return (
    <View style={styles.waltzContainer}>
      <Text style={styles.waltzTitle}>{pres.title}</Text>
      <Text style={styles.waltzSubtitle}>{pres.subtitle}</Text>
      <Text style={styles.waltzPurposeHint}>{(pres as Record<string,string>).purposeHint}</Text>
      {measures.map((m, idx) => {
        const sel = selections[m.id];
        return (
          <View key={m.id} style={styles.waltzMeasure}>
            <View style={styles.waltzMeasureHeader}>
              <View style={styles.waltzMeasureNum}><Text style={styles.waltzMeasureNumText}>{idx + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.waltzMeasureLabel}>{m.label}</Text>
                <Text style={styles.waltzMeasureNote}>{m.note}</Text>
              </View>
            </View>
            <View style={styles.waltzOptions}>
              {m.options.map(opt => {
                const isSel = sel === opt.id;
                return (
                  <Pressable key={opt.id} style={[styles.waltzOption, isSel && styles.waltzOptionSelected]}
                    onPress={() => setSelections(prev => ({ ...prev, [m.id]: opt.id }))}>
                    <View style={[styles.waltzRadio, isSel && styles.waltzRadioSelected]} />
                    <Text style={[styles.waltzOptionText, isSel && styles.waltzOptionTextSelected]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      <Pressable style={[styles.fenSubmitBtn, !allSelected && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!allSelected}>
        <Text style={styles.fenSubmitText}>{(pres.interaction as Record<string,string>)?.submitLabel ?? "Tamamla"}</Text>
      </Pressable>
      {wrong && <View style={[styles.lockResult, styles.lockResultFail]}><Text style={[styles.lockResultText, styles.lockResultTextFail]}>{(pres.interaction as Record<string,string>)?.failureMessage ?? "Yanlış seçim."}</Text></View>}
      <Pressable style={[styles.lockHintBtn, hintRevealed && styles.lockHintBtnUsed]} onPress={handleHint} disabled={hintRevealed}>
        <Text style={styles.lockHintText}>{hintRevealed ? "İpucu Kullanıldı (−60 sn)" : "İpucu Al (−60 sn)"}</Text>
      </Pressable>
      {hintRevealed && <View style={styles.lockHintReveal}><Text style={styles.lockHintRevealText}>{sifre.cozumIpucu}</Text></View>}
    </View>
  );
}

function VentilationValveNetworkBlock({ sifre, isSolved, onSolve }: { sifre: ClueSifre; isSolved: boolean; onSolve: () => void }) {
  const pres = sifre.presentation!;
  const valves = (pres as Record<string, unknown>).valves as Array<{ id: string; label: string; initial: string }>;
  const correctStates = (pres as Record<string, unknown>).correctStates as Array<{ valveId: string; state: string }>;
  const { addTimePenalty } = useGame();
  const [states, setStates] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    valves.forEach(v => { init[v.id] = v.initial; });
    return init;
  });
  const [wrong, setWrong] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);

  const toggle = (id: string) => setStates(prev => ({ ...prev, [id]: prev[id] === "acik" ? "kapali" : "acik" }));
  const handleSubmit = () => {
    if (correctStates.every(cs => states[cs.valveId] === cs.state)) { onSolve(); }
    else { setWrong(true); setTimeout(() => setWrong(false), 2000); }
  };
  const handleHint = () => { if (hintRevealed) return; setHintRevealed(true); addTimePenalty(60); };

  if (isSolved) return (
    <View style={styles.miniGameSolvedBlock}>
      <MaterialIcons name="check-circle" size={20} color="#22c55e" />
      <Text style={styles.miniGameSolvedText}>{(pres.interaction as Record<string,string>)?.successMessage ?? "Çözüldü!"}</Text>
      <Text style={styles.miniGameAciklama}>{sifre.aciklama}</Text>
    </View>
  );

  return (
    <View style={styles.valveContainer}>
      <Text style={styles.valveTitle}>{pres.title}</Text>
      <Text style={styles.valveSubtitle}>{pres.subtitle}</Text>
      <Text style={styles.valvePurposeHint}>{(pres as Record<string,string>).purposeHint}</Text>
      <View style={styles.valveGrid}>
        {valves.map(valve => {
          const isOpen = states[valve.id] === "acik";
          return (
            <Pressable key={valve.id} style={styles.valveItem} onPress={() => toggle(valve.id)}>
              <View style={[styles.valveIconBox, isOpen ? styles.valveIconOpen : styles.valveIconClosed]}>
                <MaterialIcons name={isOpen ? "lock-open" : "lock"} size={26} color={isOpen ? "#22c55e" : "#ef4444"} />
              </View>
              <Text style={styles.valveLabel}>{valve.label}</Text>
              <Text style={[styles.valveState, isOpen ? styles.valveStateOpen : styles.valveStateClosed]}>
                {isOpen ? "AÇIK" : "KAPALI"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable style={styles.fenSubmitBtn} onPress={handleSubmit}>
        <Text style={styles.fenSubmitText}>{(pres.interaction as Record<string,string>)?.submitLabel ?? "Hattı Doğrula"}</Text>
      </Pressable>
      {wrong && <View style={[styles.lockResult, styles.lockResultFail]}><Text style={[styles.lockResultText, styles.lockResultTextFail]}>{(pres.interaction as Record<string,string>)?.failureMessage ?? "Hatalı vana konumu."}</Text></View>}
      <Pressable style={[styles.lockHintBtn, hintRevealed && styles.lockHintBtnUsed]} onPress={handleHint} disabled={hintRevealed}>
        <Text style={styles.lockHintText}>{hintRevealed ? "İpucu Kullanıldı (−60 sn)" : "İpucu Al (−60 sn)"}</Text>
      </Pressable>
      {hintRevealed && <View style={styles.lockHintReveal}><Text style={styles.lockHintRevealText}>{sifre.cozumIpucu}</Text></View>}
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

  if (sifre.presentation?.style === "torn_route_reconstruction") {
    return <TornRouteReconstructionBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "broken_compass_calibration") {
    return <BrokenCompassCalibrationBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "luggage_label_match") {
    return <LuggageLabelMatchBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "negative_contact_sheet") {
    return <NegativeContactSheetBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "morse_transceiver") {
    return <MorseTransceiverBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "archive_index_reconstruction") {
    return <ArchiveIndexReconstructionBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "mechanical_lock_sequence") {
    return <MechanicalLockSequenceBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "cipher_disc_alignment") {
    return <CipherDiscAlignmentBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "timeline_board") {
    return <TimelineBoardBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "parcel_xray_layers") {
    return <ParcelXrayLayersBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "waltz_score_stitch") {
    return <WaltzScoreStitchBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

  if (sifre.presentation?.style === "ventilation_valve_network") {
    return <VentilationValveNetworkBlock sifre={sifre} isSolved={isSolved} onSolve={onSolve} />;
  }

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

function FrameShadowProfileBlock({
  profilSenteziVerisi,
  isSolved,
  onSolve,
  suspects,
}: {
  profilSenteziVerisi: import("../data/puzzles").ClueProfilSenteziVerisi;
  isSolved?: boolean;
  onSolve: () => void;
  suspects: import("../data/puzzles").Suspect[];
}) {
  const presentation = profilSenteziVerisi.presentation ?? {};
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  if (isSolved) {
    return (
      <View style={styles.profilBlock}>
        <View style={styles.profilHeader}>
          <MaterialIcons name="image-search" size={14} color="#D4A843" />
          <Text style={styles.profilHeaderText}>ÇERÇEVE GÖLGESİ PROFİLİ</Text>
        </View>
        <View style={styles.profilSolvedBadge}>
          <MaterialIcons name="check-circle" size={14} color="#22c55e" />
          <Text style={styles.profilSolvedText}>{profilSenteziVerisi.successText}</Text>
        </View>
      </View>
    );
  }

  const select = (suspectId: string) => {
    if (result?.ok) return;
    setSelectedId(suspectId);
    const ok = suspectId === profilSenteziVerisi.answerSuspectId;
    setResult({
      ok,
      message: ok ? profilSenteziVerisi.successText : profilSenteziVerisi.failureText,
    });
    if (ok) onSolve();
  };

  return (
    <View style={styles.frameShadowBlock}>
      <View style={styles.profilHeader}>
        <MaterialIcons name="image-search" size={14} color="#D4A843" />
        <Text style={styles.profilHeaderText}>
          {String(presentation.sceneLabel ?? "ÇERÇEVE GÖLGESİ PROFİLİ")}
        </Text>
      </View>
      <View style={styles.frameShadowScene}>
        <View style={styles.frameShadowSilhouette} />
        <Text style={styles.frameShadowReflectionNote}>
          {String(presentation.reflectionNote ?? "Yüz seçilemiyor; fiziksel izleri karşılaştır.")}
        </Text>
      </View>
      {presentation.purposeHint ? (
        <View style={styles.tornRoutePurposeHint}>
          <Text style={styles.tornRoutePurposeLabel}>ÇÖZÜMÜN İŞLEVİ</Text>
          <Text style={styles.tornRoutePurposeText}>{String(presentation.purposeHint)}</Text>
        </View>
      ) : null}
      <Text style={styles.profilAciklama}>{profilSenteziVerisi.aciklama}</Text>
      <Text style={styles.frameShadowEvidenceLabel}>
        {String(presentation.physicalEvidenceLabel ?? "FİZİKSEL İŞARETLER")}
      </Text>
      <View style={styles.profilDelilRow}>
        {profilSenteziVerisi.delilKartlari.map((card, i) => (
          <View key={card.id ?? String(i)} style={styles.profilDelilKart}>
            <Text style={styles.profilDelilBaslik}>{card.baslik}</Text>
            <Text style={styles.profilDelilMetin}>{card.metin}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.frameShadowSelectLabel}>PROFİLİ SEÇ — ŞÜPHELİ KARTLARINI İNCELE</Text>
      <View style={styles.profilOptionsRow}>
        {profilSenteziVerisi.optionSuspectIds.map(sid => {
          const suspectName = suspects.find(s => s.id === sid)?.name ?? sid.toUpperCase();
          const isSelected = selectedId === sid;
          const isCorrect = isSelected && result?.ok;
          const isWrong = isSelected && result && !result.ok;
          return (
            <Pressable
              key={sid}
              style={[
                styles.profilOption,
                isSelected && styles.profilOptionSelected,
                isCorrect ? styles.frameShadowOptionCorrect : undefined,
                isWrong ? styles.frameShadowOptionWrong : undefined,
              ]}
              onPress={() => select(sid)}
            >
              <View style={[styles.profilRadio, isSelected && styles.profilRadioSelected]}>
                {isSelected && <View style={styles.profilRadioDot} />}
              </View>
              <Text style={[styles.profilOptionText, isSelected && styles.profilOptionTextSelected]}>
                {suspectName}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {result && (
        <View style={[styles.tornRouteResult, result.ok ? styles.tornRouteResultOk : styles.tornRouteResultFail]}>
          <Text style={[styles.tornRouteResultText, result.ok ? styles.tornRouteResultTextOk : styles.tornRouteResultTextFail]}>
            {result.ok ? "✓ " : "✕ "}{result.message}
          </Text>
        </View>
      )}
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

  if (profilSenteziVerisi.presentation?.style === "frame_shadow_profile") {
    return (
      <FrameShadowProfileBlock
        profilSenteziVerisi={profilSenteziVerisi}
        isSolved={isSolved}
        onSolve={onSolve}
        suspects={suspects}
      />
    );
  }

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

  tornRouteBlock: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2e3550",
    borderRadius: 12,
    backgroundColor: "#10131f",
  },
  tornRouteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  tornRouteHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#D4A843",
  },
  tornRoutePurposeHint: {
    marginBottom: 10,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#D4A843",
    backgroundColor: "rgba(212,168,67,0.06)",
    borderRadius: 4,
  },
  tornRoutePurposeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 3,
  },
  tornRoutePurposeText: {
    fontSize: 12,
    color: "#ecd99a",
    lineHeight: 17,
  },
  tornRouteSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 10,
    lineHeight: 16,
  },
  tornRoutePiecesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tornRoutePiece: {
    width: "47%",
    minWidth: 140,
    borderWidth: 1,
    borderColor: "#5a5135",
    borderRadius: 10,
    backgroundColor: "#1c1e14",
    padding: 10,
    position: "relative",
  },
  tornRoutePieceSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#172b1e",
  },
  tornRouteTearRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tornRouteTear: {
    fontSize: 9,
    color: "#cdbb79",
  },
  tornRoutePieceLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#cdbb79",
  },
  tornRoutePieceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f4eccb",
    lineHeight: 18,
  },
  tornRouteBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  tornRouteBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#07110a",
  },
  tornRouteOrderBox: {
    marginBottom: 10,
    padding: 9,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#655d45",
    borderRadius: 10,
    backgroundColor: "#10120e",
  },
  tornRouteOrderLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
  },
  tornRouteOrderEmpty: {
    fontSize: 12,
    color: "#8b91ad",
  },
  tornRouteOrderItem: {
    fontSize: 12,
    color: "#d6dae8",
  },
  tornRouteArrow: {
    fontSize: 12,
    color: "#8b91ad",
  },
  tornRouteBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  tornRouteResetBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2e3550",
    backgroundColor: "#1c2138",
    alignItems: "center",
  },
  tornRouteResetText: {
    fontSize: 13,
    color: "#e8eaf2",
  },
  tornRouteSubmitBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#D4A843",
    alignItems: "center",
  },
  tornRouteSubmitBtnDisabled: {
    opacity: 0.4,
  },
  tornRouteSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1205",
  },
  tornRouteHintBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b45309",
    alignItems: "center",
    marginBottom: 6,
  },
  tornRouteHintBtnUsed: {
    opacity: 0.5,
  },
  tornRouteHintText: {
    fontSize: 13,
    color: "#fbbf24",
  },
  tornRouteHintReveal: {
    marginBottom: 6,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#b45309",
    backgroundColor: "rgba(180,83,9,0.08)",
    borderRadius: 4,
  },
  tornRouteHintRevealText: {
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 17,
  },
  tornRouteResult: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  tornRouteResultOk: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  tornRouteResultFail: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  tornRouteResultText: {
    fontSize: 13,
    lineHeight: 18,
  },
  tornRouteResultTextOk: {
    color: "#86efac",
  },
  tornRouteResultTextFail: {
    color: "#fca5a5",
  },
  tornRouteRouteResult: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  tornRouteRouteResultLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#22c55e",
    marginBottom: 4,
  },
  tornRouteRouteResultText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b7f7c8",
    lineHeight: 18,
  },

  frameShadowBlock: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2e3550",
    borderRadius: 12,
    backgroundColor: "#10131f",
  },
  frameShadowScene: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#3d3520",
    borderRadius: 12,
    backgroundColor: "#0d100f",
  },
  frameShadowSilhouette: {
    width: 52,
    height: 66,
    borderRadius: 26,
    backgroundColor: "#1a1f2e",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.2)",
    flexShrink: 0,
  },
  frameShadowReflectionNote: {
    flex: 1,
    fontSize: 12,
    color: "#d7d0b6",
    lineHeight: 17,
  },
  frameShadowEvidenceLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#D4A843",
    marginBottom: 7,
    marginTop: 2,
  },
  frameShadowSelectLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#c084fc",
    marginTop: 10,
    marginBottom: 6,
  },
  frameShadowOptionCorrect: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  frameShadowOptionWrong: {
    borderColor: "#dc2626",
    backgroundColor: "rgba(220,38,38,0.08)",
  },

  compassBlock: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3d3520",
    borderRadius: 12,
    backgroundColor: "#0e1208",
  },
  compassHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  compassHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#D4A843",
  },
  compassPurposeHint: {
    marginBottom: 10,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#D4A843",
    backgroundColor: "rgba(212,168,67,0.06)",
    borderRadius: 6,
  },
  compassPurposeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 3,
  },
  compassPurposeText: {
    fontSize: 12,
    color: "#ecd99a",
    lineHeight: 17,
  },
  compassNorthKey: {
    marginBottom: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: "#4e563f",
    borderRadius: 8,
    backgroundColor: "rgba(78,86,63,0.12)",
  },
  compassNorthKeyLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#8b9a6b",
    marginBottom: 3,
  },
  compassNorthKeyText: {
    fontSize: 12,
    color: "#d9e7c5",
    lineHeight: 17,
  },
  compassSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 10,
    lineHeight: 17,
  },
  compassSectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#6b7280",
    marginBottom: 8,
    marginTop: 4,
  },
  compassSegmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  compassSegment: {
    width: "47%",
    padding: 8,
    borderWidth: 1,
    borderRadius: 10,
    position: "relative",
  },
  compassSegmentBakir: {
    borderColor: "#655d45",
    backgroundColor: "#30291d",
  },
  compassSegmentKrom: {
    borderColor: "#6e7c92",
    backgroundColor: "#1b2230",
  },
  compassSegmentSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#1a2d1a",
  },
  compassSegTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  compassSegNotch: {
    fontSize: 9,
    color: "#8b91ad",
  },
  compassSegLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D4A843",
    letterSpacing: 0.6,
  },
  compassFaceWrap: {
    alignItems: "center",
    marginVertical: 4,
  },
  compassFace: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  compassFaceBakir: {
    borderColor: "#b99b57",
    backgroundColor: "#2a1f0d",
  },
  compassFaceKrom: {
    borderColor: "#aebfd8",
    backgroundColor: "#181f2a",
  },
  compassFaceTop: {
    position: "absolute",
    top: 4,
    alignSelf: "center",
    fontSize: 9,
    fontWeight: "800",
    color: "#f6e9bf",
  },
  compassFaceMid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compassFaceSide: {
    fontSize: 9,
    fontWeight: "800",
    color: "#f6e9bf",
  },
  compassFaceCenter: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D4A843",
  },
  compassFaceBottom: {
    position: "absolute",
    bottom: 4,
    alignSelf: "center",
    fontSize: 9,
    fontWeight: "800",
    color: "#f6e9bf",
  },
  compassFaceRot: {
    position: "absolute",
    bottom: -14,
    alignSelf: "center",
    fontSize: 9,
    color: "#8b91ad",
  },
  compassPosBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  compassPosBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0f1117",
  },
  compassRotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    gap: 4,
  },
  compassRotBtn: {
    flex: 1,
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3d4050",
    backgroundColor: "#1c2138",
    alignItems: "center",
  },
  compassRotBtnText: {
    fontSize: 11,
    color: "#e8eaf2",
  },
  compassSlotsGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  compassSlot: {
    flex: 1,
    minWidth: "22%",
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
  compassSlotEmpty: {
    borderStyle: "dashed",
    borderColor: "#3d3520",
    backgroundColor: "#0e1208",
  },
  compassSlotFilled: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  compassSlotLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#D4A843",
    marginBottom: 3,
  },
  compassSlotMark: {
    fontSize: 14,
    marginBottom: 3,
  },
  compassSlotSegLabel: {
    fontSize: 9,
    color: "#86efac",
    fontWeight: "700",
  },
  compassSlotPlaceholder: {
    fontSize: 9,
    color: "#4b5563",
  },
  compassBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  compassResetBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262c44",
    backgroundColor: "#1c2138",
    alignItems: "center",
  },
  compassResetText: {
    fontSize: 12,
    color: "#e8eaf2",
  },
  compassSubmitBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#D4A843",
    alignItems: "center",
  },
  compassSubmitBtnDisabled: {
    opacity: 0.4,
  },
  compassSubmitText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a1205",
  },
  compassHintBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b45309",
    alignItems: "center",
    marginBottom: 8,
  },
  compassHintBtnUsed: {
    opacity: 0.5,
  },
  compassHintText: {
    fontSize: 13,
    color: "#fbbf24",
  },
  compassHintReveal: {
    marginBottom: 8,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#b45309",
    backgroundColor: "rgba(180,83,9,0.08)",
    borderRadius: 6,
  },
  compassHintRevealText: {
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 17,
  },
  compassResult: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  compassResultOk: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  compassResultFail: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  compassResultText: {
    fontSize: 13,
    lineHeight: 18,
  },
  compassResultTextOk: {
    color: "#86efac",
  },
  compassResultTextFail: {
    color: "#fca5a5",
  },
  compassRouteResult: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  compassRouteResultLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#4ade80",
    marginBottom: 4,
  },
  compassRouteResultText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b7f7c8",
    lineHeight: 18,
  },
  compassAciklama: {
    marginTop: 8,
    fontSize: 12,
    color: "#8b91ad",
    fontStyle: "italic",
    lineHeight: 17,
  },

  luggageBlock: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3d2b1a",
    borderRadius: 12,
    backgroundColor: "#0e0b07",
  },
  luggageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  luggageHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#D4A843",
  },
  luggagePurposeHint: {
    marginBottom: 10,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#D4A843",
    backgroundColor: "rgba(212,168,67,0.06)",
    borderRadius: 6,
  },
  luggagePurposeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 3,
  },
  luggagePurposeText: {
    fontSize: 12,
    color: "#ecd99a",
    lineHeight: 17,
  },
  luggageSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 10,
    lineHeight: 17,
  },
  luggageCasesGrid: {
    gap: 10,
    marginBottom: 12,
  },
  luggageCaseCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#3d2b1a",
    borderRadius: 10,
    backgroundColor: "#16100a",
  },
  luggageCaseLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#D4A843",
    marginBottom: 2,
  },
  luggageCaseStamp: {
    fontSize: 11,
    color: "#a8956a",
    marginBottom: 2,
  },
  luggageCaseNote: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 8,
    fontStyle: "italic",
  },
  luggageRouteList: {
    gap: 6,
  },
  luggageRouteOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#2d2015",
    borderRadius: 8,
    backgroundColor: "#1a1208",
  },
  luggageRouteOptionSelected: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  luggageRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4b5563",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  luggageRadioSelected: {
    borderColor: "#22c55e",
  },
  luggageRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  luggageRouteLabel: {
    fontSize: 12,
    color: "#9ca3af",
    flex: 1,
    lineHeight: 17,
  },
  luggageRouteLabelSelected: {
    color: "#86efac",
  },
  luggageSubmitBtn: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#D4A843",
    alignItems: "center",
    marginBottom: 8,
  },
  luggageSubmitBtnDisabled: {
    opacity: 0.4,
  },
  luggageSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1205",
  },
  luggageHintBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b45309",
    alignItems: "center",
    marginBottom: 8,
  },
  luggageHintBtnUsed: {
    opacity: 0.5,
  },
  luggageHintText: {
    fontSize: 13,
    color: "#fbbf24",
  },
  luggageHintReveal: {
    marginBottom: 8,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#b45309",
    backgroundColor: "rgba(180,83,9,0.08)",
    borderRadius: 6,
  },
  luggageHintRevealText: {
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 17,
  },
  luggageResult: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  luggageResultOk: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  luggageResultFail: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  luggageResultText: {
    fontSize: 13,
    lineHeight: 18,
  },
  luggageResultTextOk: {
    color: "#86efac",
  },
  luggageResultTextFail: {
    color: "#fca5a5",
  },
  luggageGridEffect: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  luggageGridEffectLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#4ade80",
    marginBottom: 4,
  },
  luggageGridEffectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b7f7c8",
    lineHeight: 18,
  },
  luggageAciklama: {
    marginTop: 8,
    fontSize: 12,
    color: "#8b91ad",
    fontStyle: "italic",
    lineHeight: 17,
  },

  negativeBlock: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e2a3a",
    borderRadius: 12,
    backgroundColor: "#090d14",
  },
  negativeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  negativeHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#D4A843",
  },
  negativePurposeHint: {
    marginBottom: 10,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#D4A843",
    backgroundColor: "rgba(212,168,67,0.06)",
    borderRadius: 6,
  },
  negativePurposeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 3,
  },
  negativePurposeText: {
    fontSize: 12,
    color: "#ecd99a",
    lineHeight: 17,
  },
  negativeSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 10,
    lineHeight: 17,
  },
  negativeChecksGrid: {
    gap: 10,
    marginBottom: 12,
  },
  negativeCheckCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#1e2a3a",
    borderRadius: 10,
    backgroundColor: "#0d1520",
  },
  negativeCheckLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#D4A843",
    marginBottom: 8,
  },
  negativePhotoPair: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  negativePositiveCell: {
    flex: 1,
    padding: 7,
    backgroundColor: "#eef2fb",
    borderRadius: 6,
    minHeight: 54,
    justifyContent: "flex-end",
  },
  negativeNegativeCell: {
    flex: 1,
    padding: 7,
    backgroundColor: "#20283d",
    borderRadius: 6,
    minHeight: 54,
    justifyContent: "flex-end",
  },
  negativePhotoCellLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
    color: "#6b7280",
  },
  negativePositiveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#151a25",
  },
  negativeNegativeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#eef2fb",
  },
  negativeOptionList: {
    gap: 5,
  },
  negativeOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#1e2d40",
    borderRadius: 8,
    backgroundColor: "#0f1a28",
  },
  negativeOptionSelected: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  negativeRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4b5563",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  negativeRadioSelected: {
    borderColor: "#22c55e",
  },
  negativeRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  negativeOptionLabel: {
    fontSize: 12,
    color: "#9ca3af",
    flex: 1,
    lineHeight: 17,
  },
  negativeOptionLabelSelected: {
    color: "#86efac",
  },
  negativeSubmitBtn: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#D4A843",
    alignItems: "center",
    marginBottom: 8,
  },
  negativeSubmitBtnDisabled: {
    opacity: 0.4,
  },
  negativeSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1205",
  },
  negativeHintBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b45309",
    alignItems: "center",
    marginBottom: 8,
  },
  negativeHintBtnUsed: {
    opacity: 0.5,
  },
  negativeHintText: {
    fontSize: 13,
    color: "#fbbf24",
  },
  negativeHintReveal: {
    marginBottom: 8,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#b45309",
    backgroundColor: "rgba(180,83,9,0.08)",
    borderRadius: 6,
  },
  negativeHintRevealText: {
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 17,
  },
  negativeResult: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  negativeResultOk: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  negativeResultFail: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  negativeResultText: {
    fontSize: 13,
    lineHeight: 18,
  },
  negativeResultTextOk: {
    color: "#86efac",
  },
  negativeResultTextFail: {
    color: "#fca5a5",
  },
  negativeGridEffect: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  negativeGridEffectLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#4ade80",
    marginBottom: 4,
  },
  negativeGridEffectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b7f7c8",
    lineHeight: 18,
  },
  negativeAciklama: {
    marginTop: 8,
    fontSize: 12,
    color: "#8b91ad",
    fontStyle: "italic",
    lineHeight: 17,
  },

  morseBlock: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1a2a1a",
    borderRadius: 12,
    backgroundColor: "#080e08",
  },
  morseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  morseHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#D4A843",
  },
  morsePurposeHint: {
    marginBottom: 10,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#D4A843",
    backgroundColor: "rgba(212,168,67,0.06)",
    borderRadius: 6,
  },
  morsePurposeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 3,
  },
  morsePurposeText: {
    fontSize: 12,
    color: "#ecd99a",
    lineHeight: 17,
  },
  morseSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 10,
    lineHeight: 17,
  },
  morseChartWrap: {
    marginBottom: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: "#2a3a2a",
    borderRadius: 8,
    backgroundColor: "#0d180d",
  },
  morseChartLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#6b7280",
    marginBottom: 6,
  },
  morseChartRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  morseChartEntry: {
    alignItems: "center",
    gap: 2,
  },
  morseChartChar: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D4A843",
  },
  morseChartCode: {
    fontSize: 11,
    color: "#f3d77d",
    letterSpacing: 2,
  },
  morseSignalsList: {
    gap: 8,
    marginBottom: 12,
  },
  morseSignalCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#2a3a2a",
    borderRadius: 10,
    backgroundColor: "#0d180d",
  },
  morseSignalLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#D4A843",
    marginBottom: 4,
  },
  morseSignalCode: {
    fontSize: 20,
    letterSpacing: 4,
    color: "#f3d77d",
    marginBottom: 8,
    fontFamily: "monospace",
  },
  morseOptionRow: {
    flexDirection: "row",
    gap: 8,
  },
  morseOptionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#2a3a2a",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#111a11",
  },
  morseOptionBtnSelected: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  morseOptionChar: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6b7280",
  },
  morseOptionCharSelected: {
    color: "#4ade80",
  },
  morseSubmitBtn: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#D4A843",
    alignItems: "center",
    marginBottom: 8,
  },
  morseSubmitBtnDisabled: {
    opacity: 0.4,
  },
  morseSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1205",
  },
  morseHintBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b45309",
    alignItems: "center",
    marginBottom: 8,
  },
  morseHintBtnUsed: {
    opacity: 0.5,
  },
  morseHintText: {
    fontSize: 13,
    color: "#fbbf24",
  },
  morseHintReveal: {
    marginBottom: 8,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#b45309",
    backgroundColor: "rgba(180,83,9,0.08)",
    borderRadius: 6,
  },
  morseHintRevealText: {
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 17,
  },
  morseResult: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  morseResultOk: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  morseResultFail: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  morseResultText: {
    fontSize: 13,
    lineHeight: 18,
  },
  morseResultTextOk: {
    color: "#86efac",
  },
  morseResultTextFail: {
    color: "#fca5a5",
  },
  morseGridEffect: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  morseGridEffectLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#4ade80",
    marginBottom: 4,
  },
  morseGridEffectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b7f7c8",
    lineHeight: 18,
  },
  morseAciklama: {
    marginTop: 8,
    fontSize: 12,
    color: "#8b91ad",
    fontStyle: "italic",
    lineHeight: 17,
  },

  archiveBlock: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2a2010",
    borderRadius: 12,
    backgroundColor: "#0d0a04",
  },
  archiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  archiveHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#D4A843",
  },
  archivePurposeHint: {
    marginBottom: 10,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#D4A843",
    backgroundColor: "rgba(212,168,67,0.06)",
    borderRadius: 6,
  },
  archivePurposeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 3,
  },
  archivePurposeText: {
    fontSize: 12,
    color: "#ecd99a",
    lineHeight: 17,
  },
  archiveSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 10,
    lineHeight: 17,
  },
  archiveFileList: {
    gap: 10,
    marginBottom: 12,
  },
  archiveFileCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#2a2010",
    borderRadius: 10,
    backgroundColor: "#120e04",
  },
  archiveFileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  archiveFileCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D4A843",
    letterSpacing: 1,
  },
  archiveFileDate: {
    fontSize: 11,
    color: "#8b7a4a",
    fontStyle: "italic",
  },
  archiveFileNote: {
    fontSize: 11,
    color: "#a09060",
    marginBottom: 8,
    lineHeight: 16,
  },
  archiveSlotList: {
    gap: 4,
  },
  archiveSlotOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: "#2a2010",
    borderRadius: 7,
    backgroundColor: "#0d0a04",
  },
  archiveSlotOptionSelected: {
    borderColor: "#D4A843",
    backgroundColor: "rgba(212,168,67,0.1)",
  },
  archiveSlotRadio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#4b4030",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  archiveSlotRadioSelected: {
    borderColor: "#D4A843",
  },
  archiveSlotRadioDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#D4A843",
  },
  archiveSlotLabel: {
    fontSize: 11,
    color: "#7a6a3a",
    flex: 1,
    lineHeight: 16,
  },
  archiveSlotLabelSelected: {
    color: "#ecd99a",
  },
  archiveSubmitBtn: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#D4A843",
    alignItems: "center",
    marginBottom: 8,
  },
  archiveSubmitBtnDisabled: {
    opacity: 0.4,
  },
  archiveSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1205",
  },
  archiveHintBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b45309",
    alignItems: "center",
    marginBottom: 8,
  },
  archiveHintBtnUsed: {
    opacity: 0.5,
  },
  archiveHintText: {
    fontSize: 13,
    color: "#fbbf24",
  },
  archiveHintReveal: {
    marginBottom: 8,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#b45309",
    backgroundColor: "rgba(180,83,9,0.08)",
    borderRadius: 6,
  },
  archiveHintRevealText: {
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 17,
  },
  archiveResult: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  archiveResultOk: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  archiveResultFail: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  archiveResultText: {
    fontSize: 13,
    lineHeight: 18,
  },
  archiveResultTextOk: {
    color: "#86efac",
  },
  archiveResultTextFail: {
    color: "#fca5a5",
  },
  archiveGridEffect: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D4A843",
    borderRadius: 8,
    backgroundColor: "rgba(212,168,67,0.08)",
  },
  archiveGridEffectLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 4,
  },
  archiveGridEffectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f3d77d",
    lineHeight: 18,
  },
  archiveAciklama: {
    marginTop: 8,
    fontSize: 12,
    color: "#8b91ad",
    fontStyle: "italic",
    lineHeight: 17,
  },

  lockBlock: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3a2a10",
    borderRadius: 12,
    backgroundColor: "#0e0906",
  },
  lockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  lockHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#D4A843",
  },
  lockPurposeHint: {
    marginBottom: 10,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#D4A843",
    backgroundColor: "rgba(212,168,67,0.06)",
    borderRadius: 6,
  },
  lockPurposeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 3,
  },
  lockPurposeText: {
    fontSize: 12,
    color: "#ecd99a",
    lineHeight: 17,
  },
  lockSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 10,
    lineHeight: 17,
  },
  lockDialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  lockDialCard: {
    flex: 1,
    minWidth: 72,
    padding: 10,
    borderWidth: 1,
    borderColor: "#6e5a34",
    borderRadius: 10,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#150f06",
  },
  lockDialLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#a08040",
    textAlign: "center",
  },
  lockDialFace: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#b99b57",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1206",
  },
  lockDialSymbol: {
    fontSize: 22,
    color: "#f4e6ae",
  },
  lockDialControls: {
    flexDirection: "row",
    gap: 6,
  },
  lockRotateBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#6e5a34",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1206",
  },
  lockRotateText: {
    fontSize: 18,
    color: "#D4A843",
  },
  lockSubmitBtn: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#D4A843",
    alignItems: "center",
    marginBottom: 8,
  },
  lockSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1205",
  },
  lockHintBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b45309",
    alignItems: "center",
    marginBottom: 8,
  },
  lockHintBtnUsed: {
    opacity: 0.5,
  },
  lockHintText: {
    fontSize: 13,
    color: "#fbbf24",
  },
  lockHintReveal: {
    marginBottom: 8,
    padding: 9,
    borderLeftWidth: 2,
    borderLeftColor: "#b45309",
    backgroundColor: "rgba(180,83,9,0.08)",
    borderRadius: 6,
  },
  lockHintRevealText: {
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 17,
  },
  lockResult: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  lockResultOk: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  lockResultFail: {
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  lockResultText: {
    fontSize: 13,
    lineHeight: 18,
  },
  lockResultTextOk: {
    color: "#86efac",
  },
  lockResultTextFail: {
    color: "#fca5a5",
  },
  lockGridEffect: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D4A843",
    borderRadius: 8,
    backgroundColor: "rgba(212,168,67,0.08)",
  },
  lockGridEffectLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#D4A843",
    marginBottom: 4,
  },
  lockGridEffectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f3d77d",
    lineHeight: 18,
  },
  lockAciklama: {
    marginTop: 8,
    fontSize: 12,
    color: "#8b91ad",
    fontStyle: "italic",
    lineHeight: 17,
  },
  // ── shared Fenomen submit button ──
  fenSubmitBtn: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#D4A843",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  fenSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1205",
  },
  // ── CipherDiscAlignmentBlock ──
  discContainer: {
    gap: 8,
  },
  discTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D4A843",
    marginBottom: 2,
  },
  discSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 4,
  },
  discPurposeHint: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 15,
  },
  discRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  discLabel: {
    fontSize: 12,
    color: "#9ca3af",
    flex: 1,
  },
  discControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  discArrow: {
    padding: 4,
  },
  discSymbolBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(212,168,67,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  discSymbol: {
    fontSize: 22,
    color: "#D4A843",
  },
  // ── TimelineBoardBlock ──
  tlContainer: {
    gap: 6,
  },
  tlTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D4A843",
    marginBottom: 2,
  },
  tlSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 4,
  },
  tlPurposeHint: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 15,
  },
  tlCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    gap: 8,
  },
  tlCardBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(212,168,67,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  tlCardBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4A843",
  },
  tlCardBody: {
    flex: 1,
  },
  tlCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e2e8f0",
    marginBottom: 2,
  },
  tlCardText: {
    fontSize: 11,
    color: "#8b91ad",
    lineHeight: 15,
  },
  tlCardArrows: {
    gap: 4,
  },
  tlArrow: {
    padding: 2,
  },
  // ── ParcelXrayLayersBlock ──
  xrayContainer: {
    gap: 6,
  },
  xrayTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#60a5fa",
    marginBottom: 2,
  },
  xraySubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 4,
  },
  xrayPurposeHint: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 15,
  },
  xrayLayer: {
    backgroundColor: "rgba(96,165,250,0.05)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.15)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  xrayLayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  xrayLayerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#93c5fd",
  },
  xrayLayerScan: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 6,
    lineHeight: 14,
  },
  xrayOptions: {
    gap: 4,
  },
  xrayOption: {
    padding: 7,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  xrayOptionSelected: {
    backgroundColor: "rgba(96,165,250,0.15)",
    borderColor: "#60a5fa",
  },
  xrayOptionText: {
    fontSize: 11,
    color: "#9ca3af",
    lineHeight: 15,
  },
  xrayOptionTextSelected: {
    color: "#93c5fd",
    fontWeight: "600",
  },
  // ── WaltzScoreStitchBlock ──
  waltzContainer: {
    gap: 6,
  },
  waltzTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e879f9",
    marginBottom: 2,
  },
  waltzSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 4,
  },
  waltzPurposeHint: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 15,
  },
  waltzMeasure: {
    backgroundColor: "rgba(232,121,249,0.05)",
    borderWidth: 1,
    borderColor: "rgba(232,121,249,0.15)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  waltzMeasureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  waltzMeasureNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(232,121,249,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  waltzMeasureNumText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e879f9",
  },
  waltzMeasureLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  waltzMeasureNote: {
    fontSize: 10,
    color: "#8b91ad",
    fontStyle: "italic",
  },
  waltzOptions: {
    gap: 4,
  },
  waltzOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 7,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  waltzOptionSelected: {
    backgroundColor: "rgba(232,121,249,0.12)",
    borderColor: "#e879f9",
  },
  waltzRadio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#4b5563",
  },
  waltzRadioSelected: {
    borderColor: "#e879f9",
    backgroundColor: "#e879f9",
  },
  waltzOptionText: {
    fontSize: 11,
    color: "#9ca3af",
    flex: 1,
    lineHeight: 15,
  },
  waltzOptionTextSelected: {
    color: "#f5d0fe",
    fontWeight: "600",
  },
  // ── VentilationValveNetworkBlock ──
  valveContainer: {
    gap: 6,
  },
  valveTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#34d399",
    marginBottom: 2,
  },
  valveSubtitle: {
    fontSize: 12,
    color: "#8b91ad",
    marginBottom: 4,
  },
  valvePurposeHint: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 15,
  },
  valveGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  valveItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  valveIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  valveIconOpen: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  valveIconClosed: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  valveLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 4,
  },
  valveState: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  valveStateOpen: {
    color: "#22c55e",
  },
  valveStateClosed: {
    color: "#ef4444",
  },
});
