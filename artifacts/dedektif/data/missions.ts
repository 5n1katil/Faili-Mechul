export type MissionType = "daily" | "weekly" | "achievement";
export type MissionTier = "caylak" | "dedektif" | "baskomiser";

export type RequirementType =
  | "solve_count"
  | "perfect_solve"
  | "speed_solve"
  | "streak_days"
  | "solve_difficulty"
  | "high_score_once"
  | "total_solved"
  | "total_perfect"
  | "total_score";

export interface MissionRequirement {
  type: RequirementType;
  value: number;
  difficulty?: "caylik" | "dedektif" | "baskomiser";
  timeLimit?: number;
}

export interface MissionReward {
  points: number;
  badge?: string;
}

export interface Mission {
  id: string;
  type: MissionType;
  tier: MissionTier;
  title: string;
  description: string;
  icon: string;
  requirement: MissionRequirement;
  reward: MissionReward;
}

export const DAILY_MISSIONS: Mission[] = [
  {
    id: "daily_first_solve",
    type: "daily",
    tier: "caylak",
    title: "Güne Başlangıç",
    description: "Bugün en az 1 bulmaca çöz",
    icon: "play-circle-filled",
    requirement: { type: "solve_count", value: 1 },
    reward: { points: 500 },
  },
  {
    id: "daily_flawless",
    type: "daily",
    tier: "caylak",
    title: "Temiz Dosya",
    description: "Bugün hiç hata yapmadan bir bulmaca çöz",
    icon: "verified",
    requirement: { type: "perfect_solve", value: 1 },
    reward: { points: 800 },
  },
  {
    id: "daily_fast",
    type: "daily",
    tier: "dedektif",
    title: "Zaman Baskısı",
    description: "Bugün 5 dakikadan kısa sürede bir bulmaca çöz",
    icon: "bolt",
    requirement: { type: "speed_solve", value: 1, timeLimit: 300 },
    reward: { points: 750 },
  },
  {
    id: "daily_double",
    type: "daily",
    tier: "dedektif",
    title: "Çifte Vaka",
    description: "Bugün 2 farklı bulmaca çöz",
    icon: "auto-stories",
    requirement: { type: "solve_count", value: 2 },
    reward: { points: 1000 },
  },
  {
    id: "daily_hard",
    type: "daily",
    tier: "baskomiser",
    title: "Zorlu Gün",
    description: "Bugün Dedektif veya Baş Komiser seviyesinde çöz",
    icon: "military-tech",
    requirement: { type: "solve_difficulty", value: 1, difficulty: "dedektif" },
    reward: { points: 1200 },
  },
];

export const WEEKLY_MISSIONS: Mission[] = [
  {
    id: "weekly_patrol",
    type: "weekly",
    tier: "caylak",
    title: "Haftalık Devriye",
    description: "Bu hafta 5 bulmaca çöz",
    icon: "folder-special",
    requirement: { type: "solve_count", value: 5 },
    reward: { points: 2000 },
  },
  {
    id: "weekly_perfect",
    type: "weekly",
    tier: "dedektif",
    title: "Tertemiz Hafta",
    description: "Bu hafta 3 hatasız çözüm yap",
    icon: "star",
    requirement: { type: "perfect_solve", value: 3 },
    reward: { points: 3000 },
  },
  {
    id: "weekly_fast",
    type: "weekly",
    tier: "dedektif",
    title: "Saat Ustası",
    description: "Bu hafta 3 bulmacayı 4 dakikadan kısa çöz",
    icon: "timer",
    requirement: { type: "speed_solve", value: 3, timeLimit: 240 },
    reward: { points: 2500 },
  },
  {
    id: "weekly_hard",
    type: "weekly",
    tier: "baskomiser",
    title: "Zorlu Hafta",
    description: "Bu hafta 2 Baş Komiser bulmacası çöz",
    icon: "local-police",
    requirement: { type: "solve_difficulty", value: 2, difficulty: "baskomiser" },
    reward: { points: 3500 },
  },
  {
    id: "weekly_master",
    type: "weekly",
    tier: "baskomiser",
    title: "Haftalık Şampiyon",
    description: "Bu hafta 8 bulmaca çöz",
    icon: "workspace-premium",
    requirement: { type: "solve_count", value: 8 },
    reward: { points: 4000 },
  },
];

export const ACHIEVEMENT_MISSIONS: Mission[] = [
  {
    id: "ach_solve_1",
    type: "achievement",
    tier: "caylak",
    title: "İlk Adım",
    description: "İlk bulmacayı çöz",
    icon: "emoji-events",
    requirement: { type: "total_solved", value: 1 },
    reward: { points: 200 },
  },
  {
    id: "ach_solve_5",
    type: "achievement",
    tier: "caylak",
    title: "Acemi Dedektif",
    description: "Toplamda 5 bulmaca çöz",
    icon: "star",
    requirement: { type: "total_solved", value: 5 },
    reward: { points: 1000 },
  },
  {
    id: "ach_solve_10",
    type: "achievement",
    tier: "caylak",
    title: "On Dosya",
    description: "Toplamda 10 bulmaca çöz",
    icon: "star-half",
    requirement: { type: "total_solved", value: 10 },
    reward: { points: 2000 },
  },
  {
    id: "ach_solve_20",
    type: "achievement",
    tier: "caylak",
    title: "Yirmi Vaka",
    description: "Toplamda 20 bulmaca çöz",
    icon: "grade",
    requirement: { type: "total_solved", value: 20 },
    reward: { points: 4000 },
  },
  {
    id: "ach_perfect_1",
    type: "achievement",
    tier: "caylak",
    title: "Lekesiz Sicil",
    description: "Bir bulmacayı hiç hata yapmadan çöz",
    icon: "verified",
    requirement: { type: "total_perfect", value: 1 },
    reward: { points: 500 },
  },
  {
    id: "ach_perfect_5",
    type: "achievement",
    tier: "caylak",
    title: "Beş Yıldız",
    description: "5 bulmacayı hatasız çöz",
    icon: "star",
    requirement: { type: "total_perfect", value: 5 },
    reward: { points: 2000 },
  },
  {
    id: "ach_streak_3",
    type: "achievement",
    tier: "caylak",
    title: "İlk Seri",
    description: "3 günlük seri oluştur",
    icon: "local-fire-department",
    requirement: { type: "streak_days", value: 3 },
    reward: { points: 1000 },
  },
  {
    id: "ach_streak_7",
    type: "achievement",
    tier: "caylak",
    title: "Haftalık Seri",
    description: "7 günlük seri oluştur",
    icon: "local-fire-department",
    requirement: { type: "streak_days", value: 7 },
    reward: { points: 2000 },
  },
  {
    id: "ach_speed_3min",
    type: "achievement",
    tier: "caylak",
    title: "Hızlı Dedektif",
    description: "Bir bulmacayı 3 dakikadan kısa sürede çöz",
    icon: "bolt",
    requirement: { type: "speed_solve", value: 1, timeLimit: 180 },
    reward: { points: 1500 },
  },
  {
    id: "ach_detective_5",
    type: "achievement",
    tier: "caylak",
    title: "Dedektif Çırağı",
    description: "5 Dedektif seviyesi bulmaca çöz",
    icon: "search",
    requirement: { type: "solve_difficulty", value: 5, difficulty: "dedektif" },
    reward: { points: 2000 },
  },
  {
    id: "ach_solve_30",
    type: "achievement",
    tier: "dedektif",
    title: "Otuz Vaka",
    description: "Toplamda 30 bulmaca çöz",
    icon: "military-tech",
    requirement: { type: "total_solved", value: 30 },
    reward: { points: 5000, badge: "otuz_vaka" },
  },
  {
    id: "ach_solve_50",
    type: "achievement",
    tier: "dedektif",
    title: "Elli Vaka",
    description: "Toplamda 50 bulmaca çöz",
    icon: "military-tech",
    requirement: { type: "total_solved", value: 50 },
    reward: { points: 8000, badge: "elli_vaka" },
  },
  {
    id: "ach_perfect_10",
    type: "achievement",
    tier: "dedektif",
    title: "Mükemmel On",
    description: "10 bulmacayı hatasız çöz",
    icon: "verified",
    requirement: { type: "total_perfect", value: 10 },
    reward: { points: 5000, badge: "sifir_hata_usta" },
  },
  {
    id: "ach_streak_14",
    type: "achievement",
    tier: "dedektif",
    title: "İki Hafta Serisi",
    description: "14 günlük seri oluştur",
    icon: "whatshot",
    requirement: { type: "streak_days", value: 14 },
    reward: { points: 4000, badge: "iki_hafta_serisi" },
  },
  {
    id: "ach_speed_5",
    type: "achievement",
    tier: "dedektif",
    title: "Hız Makinesi",
    description: "5 bulmacayı 3 dakikadan kısa sürede çöz",
    icon: "speed",
    requirement: { type: "speed_solve", value: 5, timeLimit: 180 },
    reward: { points: 4000, badge: "hiz_makinesi" },
  },
  {
    id: "ach_detective_10",
    type: "achievement",
    tier: "dedektif",
    title: "Dedektif Ustası",
    description: "10 Dedektif seviyesi bulmaca çöz",
    icon: "manage-search",
    requirement: { type: "solve_difficulty", value: 10, difficulty: "dedektif" },
    reward: { points: 5000, badge: "dedektif_usta" },
  },
  {
    id: "ach_baskomiser_5",
    type: "achievement",
    tier: "dedektif",
    title: "Komiser Çıraklığı",
    description: "5 Baş Komiser seviyesi bulmaca çöz",
    icon: "local-police",
    requirement: { type: "solve_difficulty", value: 5, difficulty: "baskomiser" },
    reward: { points: 5000, badge: "komiser_cirak" },
  },
  {
    id: "ach_score_12000",
    type: "achievement",
    tier: "dedektif",
    title: "Puan Ustası",
    description: "Tek bir bulmacada 12.000+ puan kazan",
    icon: "trending-up",
    requirement: { type: "high_score_once", value: 12000 },
    reward: { points: 3000, badge: "puan_usta" },
  },
  {
    id: "ach_streak_21",
    type: "achievement",
    tier: "dedektif",
    title: "Üç Hafta",
    description: "21 günlük seri oluştur",
    icon: "whatshot",
    requirement: { type: "streak_days", value: 21 },
    reward: { points: 6000, badge: "uc_hafta_serisi" },
  },
  {
    id: "ach_total_score_50k",
    type: "achievement",
    tier: "dedektif",
    title: "Puan Koleksiyoncusu",
    description: "Toplam 50.000 puan kazan",
    icon: "savings",
    requirement: { type: "total_score", value: 50000 },
    reward: { points: 5000 },
  },
  {
    id: "ach_solve_100",
    type: "achievement",
    tier: "baskomiser",
    title: "Yüz Vaka",
    description: "Toplamda 100 bulmaca çöz",
    icon: "auto-graph",
    requirement: { type: "total_solved", value: 100 },
    reward: { points: 15000, badge: "yuz_vaka" },
  },
  {
    id: "ach_perfect_20",
    type: "achievement",
    tier: "baskomiser",
    title: "Mükemmeliyetçi",
    description: "20 bulmacayı hatasız çöz",
    icon: "verified",
    requirement: { type: "total_perfect", value: 20 },
    reward: { points: 10000, badge: "mukemmeliyetci" },
  },
  {
    id: "ach_perfect_30",
    type: "achievement",
    tier: "baskomiser",
    title: "Altın Sicil",
    description: "30 bulmacayı hatasız çöz",
    icon: "workspace-premium",
    requirement: { type: "total_perfect", value: 30 },
    reward: { points: 15000, badge: "altin_sicil" },
  },
  {
    id: "ach_streak_30",
    type: "achievement",
    tier: "baskomiser",
    title: "Ay Serisi",
    description: "30 günlük seri oluştur",
    icon: "local-fire-department",
    requirement: { type: "streak_days", value: 30 },
    reward: { points: 10000, badge: "ay_serisi" },
  },
  {
    id: "ach_streak_50",
    type: "achievement",
    tier: "baskomiser",
    title: "Efsane Seri",
    description: "50 günlük seri oluştur",
    icon: "whatshot",
    requirement: { type: "streak_days", value: 50 },
    reward: { points: 20000, badge: "efsane_seri" },
  },
  {
    id: "ach_speed_ultra",
    type: "achievement",
    tier: "baskomiser",
    title: "Şimşek",
    description: "Bir bulmacayı 90 saniyeden kısa sürede çöz",
    icon: "flash-on",
    requirement: { type: "speed_solve", value: 1, timeLimit: 90 },
    reward: { points: 8000, badge: "simsek" },
  },
  {
    id: "ach_baskomiser_10",
    type: "achievement",
    tier: "baskomiser",
    title: "Komiser Ustası",
    description: "10 Baş Komiser seviyesi bulmaca çöz",
    icon: "gavel",
    requirement: { type: "solve_difficulty", value: 10, difficulty: "baskomiser" },
    reward: { points: 10000, badge: "komiser_usta" },
  },
  {
    id: "ach_total_score_100k",
    type: "achievement",
    tier: "baskomiser",
    title: "Puan Efsanesi",
    description: "Toplam 100.000 puan kazan",
    icon: "diamond",
    requirement: { type: "total_score", value: 100000 },
    reward: { points: 10000, badge: "puan_efsane" },
  },
  {
    id: "ach_score_15000",
    type: "achievement",
    tier: "baskomiser",
    title: "Yüksek Gerilim",
    description: "Tek bir bulmacada 15.000+ puan kazan",
    icon: "trending-up",
    requirement: { type: "high_score_once", value: 15000 },
    reward: { points: 10000, badge: "yuksek_gerilim" },
  },
  {
    id: "ach_total_score_200k",
    type: "achievement",
    tier: "baskomiser",
    title: "Efsane Hazinesi",
    description: "Toplam 200.000 puan kazan",
    icon: "emoji-events",
    requirement: { type: "total_score", value: 200000 },
    reward: { points: 20000, badge: "efsane_hazine" },
  },
];

export const ALL_MISSIONS: Mission[] = [
  ...DAILY_MISSIONS,
  ...WEEKLY_MISSIONS,
  ...ACHIEVEMENT_MISSIONS,
];

export function getTierLabel(tier: MissionTier): string {
  switch (tier) {
    case "caylak": return "Çaylak";
    case "dedektif": return "Dedektif";
    case "baskomiser": return "Baş Komiser";
  }
}

export function getTierColor(tier: MissionTier): string {
  switch (tier) {
    case "caylak": return "#4CAF50";
    case "dedektif": return "#60A5FA";
    case "baskomiser": return "#D4A843";
  }
}
