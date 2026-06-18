import React, { useState } from "react";
import type { ComponentProps } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

function SesKaydiBlock({ sesMetni }: { sesMetni: string }) {
  return (
    <View style={styles.sesBlock}>
      <View style={styles.sesHeader}>
        <MaterialIcons name="mic" size={14} color="#3b82f6" />
        <Text style={styles.sesLabel}>SES KAYDI TRANSKRİPTİ</Text>
        <View style={styles.sesBadge}>
          <View style={styles.sesDot} />
          <Text style={styles.sesRec}>REC</Text>
        </View>
      </View>
      <Text style={styles.sesText}>{sesMetni}</Text>
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
        return clue.sesMetni ? (
          <SesKaydiBlock sesMetni={clue.sesMetni} />
        ) : null;

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

      default:
        return null;
    }
  };

  const mechanicContent = isRevealed ? renderMechanicContent() : null;
  const showDeductionHint = clue.deductionHint && isRevealed &&
    (mechanic === "text" || mechanic === "gorsel_ipucu" || mechanic === "ses_kaydi" || mechanic === "tanik_yuzlesme" || mechanic === "sifreli_mesaj" || mechanic === "phone_chain" || mechanic === "parmak_izi" || isSolved);

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
    gap: 6,
    borderWidth: 1,
    borderColor: "#9333ea44",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderStyle: "dashed",
  },
  sifreHintBtnText: {
    fontSize: 12,
    color: "#9333ea",
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
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 6,
  },
  parmakIziConfirmBtnDisabled: {
    backgroundColor: "#1a1000",
  },
  parmakIziConfirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1117",
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
