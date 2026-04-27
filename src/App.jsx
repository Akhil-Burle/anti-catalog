import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState, useEffect, useCallback } from "react";
import "./index.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Tv,
  Laugh,
  Skull,
  Heart,
  Swords,
  Timer,
  Clock,
  Hourglass,
  RefreshCw,
  Film,
  Play,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  User,
  History,
  Eye,
  EyeOff,
  Settings,
  Globe,
  Star,
  CalendarDays,
  FastForward,
  Snail,
  Gem,
  TrendingUp,
  CheckSquare,
  Sliders,
  Settings2,
  Moon,
  Sun,
  Share2,
  Zap,
  Search,
  Trash2,
  X,
  Bell,
  BarChart3,
  Target,
  Activity,
  PieChart,
  TrendingDown,
} from "lucide-react";

// --- FIREBASE SETUP ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Replace the old Firebase Config block:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "the-anti-catalog-prod";

// --- GEMINI API ENGINE ---

/* const fetchGemini = async (prompt, isJson = false, retries = 3) => {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (isJson) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          year: { type: "INTEGER" },
          pitch: { type: "STRING" },
          reasoning: { type: "STRING" },
          platforms: { type: "ARRAY", items: { type: "STRING" } },
          imdbRating: { type: "STRING" },
        },
        required: [
          "title",
          "year",
          "pitch",
          "reasoning",
          "platforms",
          "imdbRating",
        ],
      },
    };
  }

  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return isJson ? JSON.parse(text) : text;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
    }
  }
}; */

// Grab the key from your Vercel/Local .env file

const fetchGemini = async (prompt, isJson = false, retries = 3) => {
  // Initialize the official SDK
  const genAI = new GoogleGenerativeAI(apiKey);

  // The SDK automatically resolves the correct backend URLs for 1.5-flash
  // Change this inside your fetchGemini function:
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // <-- Welcome to 2026
    generationConfig: isJson ? { responseMimeType: "application/json" } : {},
  });

  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text();

      if (!text) throw new Error("Empty response from AI");

      if (isJson) {
        // Fallback cleanup in case Gemini wraps the JSON in markdown code blocks
        text = text
          .replace(/```json/gi, "")
          .replace(/```/gi, "")
          .trim();
        return JSON.parse(text);
      }
      return text;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error; // If we're out of retries, crash gracefully

      // Exponential backoff before retrying
      await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, i)));
    }
  }
};
const fetchMovieRecommendation = async (
  answersToUse,
  previousTitles = [],
  subscriptions = [],
  userHistoryContext = {
    loved: [],
    disliked: [],
    doNotRecommend: [],
    rewatchable: [],
    archetype: "New User",
  },
  languages = [],
  isSurprise = false,
) => {
  const prompt = `You are an elite movie curator for a user based in INDIA. Recommend EXACTLY ONE movie.
    
    ${
      isSurprise
        ? `CRITICAL INSTRUCTION: The user hit "SURPRISE ME". Ignore standard constraints. Look at their taste profile and recommend an absolute 10/10 masterpiece that they will love, regardless of genre or era.`
        : `CRITICAL INSTRUCTION: The user has provided specific preferences. You MUST select a movie that strictly satisfies EVERY SINGLE preference. High accuracy is mandatory.`
    }

    ${
      !isSurprise
        ? `USER PREFERENCES:\n${Object.entries(answersToUse)
            .map(([k, v]) => `- ${v}`)
            .join("\n")}`
        : ""
    }
    
    VIEWER ARCHETYPE: 
    ${userHistoryContext.archetype}
    
    USER TASTE PROFILE:
    ${userHistoryContext.loved.length > 0 ? `- The user LOVED (8-10 stars): ${userHistoryContext.loved.join(", ")}. Use these as a strong baseline for their taste.` : ""}
    ${userHistoryContext.disliked.length > 0 ? `- The user DISLIKED (1-4 stars): ${userHistoryContext.disliked.join(", ")}. AVOID movies with similar pacing, themes, or reception.` : ""}
    
    ${userHistoryContext.doNotRecommend.length > 0 ? `- ALREADY SEEN / DO NOT RECOMMEND: ${userHistoryContext.doNotRecommend.join(", ")}. DO NOT suggest these.` : ""}
    ${userHistoryContext.rewatchable.length > 0 ? `- ELIGIBLE FOR REWATCH: ${userHistoryContext.rewatchable.join(", ")}. The user allows re-watching highly-rated movies they haven't seen recently. You MAY recommend one of these IF it perfectly fits the current vibe, otherwise pick a new movie.` : ""}

    ${previousTitles.length > 0 ? `DO NOT recommend these movies again: ${previousTitles.join(", ")}` : ""}
    
    CRITICAL REGION, AVAILABILITY & LANGUAGE RULES:
    1. The target audience is currently in INDIA. You can recommend both Hollywood and great Indian Cinema.
    ${languages.length > 0 ? `2. STRICT LANGUAGE RULE: Primary spoken language MUST be one of: ${languages.join(", ")}. (Or an excellent dub).` : `2. Provide movies in any language.`}
    ${
      subscriptions.length > 0
        ? `3. STRICT PLATFORM RULE: The movie MUST be currently available to stream on at least one of these exact platforms in India: ${subscriptions.join(", ")}. DO NOT hallucinate or invent platforms. If it is absolutely not available on these, return ["Not Available on Selected"] in the platforms array.`
        : `3. Provide streaming platforms where it is currently available in the Indian region. DO NOT invent fake platforms.`
    }
    
    Provide a highly engaging 2-sentence pitch, a 1-sentence 'reasoning' explaining exactly why this matches their parameters/taste, the IMDb rating purely as a number (e.g., "8.5"), and a list of the exact streaming platforms it's realistically on right now in India.`;

  return await fetchGemini(prompt, true);
};

// Clipboard Fallback (For iFrame support)
const copyToClipboardFallback = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
  } catch (error) {
    console.error("Fallback copy failed", error);
  }
  document.body.removeChild(textArea);
};

// --- APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("home");

  const [appState, setAppState] = useState("intro"); // intro, questions, loading, result
  const [currentQIndex, setCurrentQIndex] = useState(0);

  const [answers, setAnswers] = useState({});
  const [recommendationList, setRecommendationList] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [rerollsLeft, setRerollsLeft] = useState(3);
  const [dbStatus, setDbStatus] = useState("idle");

  // --- MASTER PROFILE STATES ---
  const [mySubs, setMySubs] = useState([]);
  const [myLanguages, setMyLanguages] = useState([]);
  const [surveyLength, setSurveyLength] = useState("short");
  const [allowRewatch, setAllowRewatch] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  // --- SESSION SPECIFIC STATES ---
  const [sessionSubs, setSessionSubs] = useState([]);
  const [sessionLanguages, setSessionLanguages] = useState([]);
  const [sessionSurveyLength, setSessionSurveyLength] = useState("short");
  const [sessionAllowRewatch, setSessionAllowRewatch] = useState(false);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [isSurpriseMode, setIsSurpriseMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const AVAILABLE_SUBSCRIPTIONS = [
    "Netflix",
    "Prime Video",
    "JioHotstar",
    "SonyLIV",
    "ZEE5",
    "Apple TV+",
    "Lionsgate Play",
    "Sun NXT",
    "Discovery+",
  ];
  const AVAILABLE_LANGUAGES = [
    "Hindi",
    "English",
    "Tamil",
    "Telugu",
    "Malayalam",
    "Kannada",
    "Marathi",
    "Bengali",
    "Korean",
    "Japanese",
  ];

  const getQuestions = () => {
    const base = [
      {
        key: "q1",
        title: "Mental capacity tonight?",
        options: [
          {
            label: "Make me think",
            value: "Thought-provoking, complex plot",
            icon: Brain,
          },
          {
            label: "Just entertain me",
            value: "Turn brain off, purely entertaining",
            icon: Tv,
          },
        ],
      },
      {
        key: "q2",
        title: "What's the vibe?",
        options: [
          { label: "Laugh", value: "Comedy / Funny", icon: Laugh },
          {
            label: "Thrill",
            value: "Thriller / Suspense / Scary",
            icon: Skull,
          },
          { label: "Cry", value: "Emotional / Drama", icon: Heart },
          { label: "Action", value: "Action / Adrenaline", icon: Swords },
        ],
      },
      {
        key: "q3",
        title: "Time limit?",
        options: [
          {
            label: "Under 90 mins",
            value: "Strictly under 90 minutes",
            icon: Timer,
          },
          { label: "Standard 2 hrs", value: "Around 120 minutes", icon: Clock },
          { label: "Epic 3+ hrs", value: "Epic 180+ minutes", icon: Hourglass },
        ],
      },
    ];
    if (sessionSurveyLength === "short") return base;

    const medium = [
      ...base,
      {
        key: "q4",
        title: "Preferred Era?",
        options: [
          {
            label: "Classic (Pre-2000)",
            value: "Pre-2000s Classic",
            icon: CalendarDays,
          },
          { label: "Modern (2000-2019)", value: "2000s to 2010s", icon: Tv },
          { label: "Recent (2020+)", value: "2020 or newer", icon: Sparkles },
        ],
      },
      {
        key: "q5",
        title: "Pacing?",
        options: [
          {
            label: "Slow Burn",
            value: "Slow burn, atmospheric build-up",
            icon: Snail,
          },
          {
            label: "Fast & Snappy",
            value: "Fast-paced, keeps moving constantly",
            icon: FastForward,
          },
        ],
      },
    ];
    if (sessionSurveyLength === "medium") return medium;

    return [
      ...medium,
      {
        key: "q6",
        title: "Visual Tone?",
        options: [
          {
            label: "Dark & Gritty",
            value: "Dark, gritty, realistic, or cynical tone",
            icon: Moon,
          },
          {
            label: "Light & Hopeful",
            value: "Bright, uplifting, visually popping, or hopeful",
            icon: Sun,
          },
        ],
      },
      {
        key: "q7",
        title: "Familiarity?",
        options: [
          {
            label: "Hidden Gem",
            value:
              "Obscure/Hidden Gem, critically acclaimed but not mainstream",
            icon: Gem,
          },
          {
            label: "Popular Blockbuster",
            value: "Popular, highly rated blockbuster, everyone knows it",
            icon: TrendingUp,
          },
        ],
      },
    ];
  };

  const currentQuestions = getQuestions();

  // 1. Firebase Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Login Error:", error);
      showToast("Login failed. Try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await signInAnonymously(auth);
      setCurrentView("home");
      showToast("Successfully signed out.");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // 1.5 Load User Profile & History
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const profileRef = doc(
          db,
          "artifacts",
          appId,
          "users",
          user.uid,
          "settings",
          "profile",
        );
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.subscriptions) {
            setMySubs(data.subscriptions);
            setSessionSubs(data.subscriptions);
          }
          if (data.languages) {
            setMyLanguages(data.languages);
            setSessionLanguages(data.languages);
          }
          if (data.surveyLength) {
            setSurveyLength(data.surveyLength);
            setSessionSurveyLength(data.surveyLength);
          }
          if (data.allowRewatch !== undefined) {
            setAllowRewatch(data.allowRewatch);
            setSessionAllowRewatch(data.allowRewatch);
          }
        }
      } catch (e) {
        console.error("Error loading profile:", e);
      }
    };
    loadProfile();

    const historyRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      user.uid,
      "recommendations",
    );
    const unsubHistory = onSnapshot(
      historyRef,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort(
          (a, b) =>
            (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0),
        );
        setHistoryData(data);
      },
      (err) => console.error("Error loading history:", err),
    );

    return () => unsubHistory();
  }, [user]);

  // Profile Toggles
  const updateProfile = async (key, val) => {
    if (!user) return;
    try {
      const profileRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "settings",
        "profile",
      );
      await setDoc(profileRef, { [key]: val }, { merge: true });
    } catch (e) {
      console.error(`Error saving ${key}:`, e);
    }
  };

  const toggleSubscription = (sub) => {
    const newSubs = mySubs.includes(sub)
      ? mySubs.filter((s) => s !== sub)
      : [...mySubs, sub];
    setMySubs(newSubs);
    setSessionSubs(newSubs);
    updateProfile("subscriptions", newSubs);
  };
  const toggleLanguage = (lang) => {
    const newLangs = myLanguages.includes(lang)
      ? myLanguages.filter((l) => l !== lang)
      : [...myLanguages, lang];
    setMyLanguages(newLangs);
    setSessionLanguages(newLangs);
    updateProfile("languages", newLangs);
  };
  const toggleSurveyLength = (length) => {
    setSurveyLength(length);
    setSessionSurveyLength(length);
    updateProfile("surveyLength", length);
  };
  const toggleAllowRewatch = () => {
    const newVal = !allowRewatch;
    setAllowRewatch(newVal);
    setSessionAllowRewatch(newVal);
    updateProfile("allowRewatch", newVal);
  };

  // Session Toggles
  const toggleSessionSub = (sub) =>
    setSessionSubs((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  const toggleSessionLanguage = (lang) =>
    setSessionLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );

  // Actions
  const toggleWatched = async (id, currentWatchedStatus) => {
    if (!user) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "recommendations",
        id,
      );
      await updateDoc(docRef, { watched: !currentWatchedStatus });
    } catch (e) {
      showToast("Failed to update status.");
    }
  };

  const handleRating = async (id, ratingValue) => {
    if (!user || !id) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "recommendations",
        id,
      );
      await updateDoc(docRef, { rating: ratingValue });
      setRecommendationList((prev) =>
        prev.map((m, i) =>
          i === currentResultIndex ? { ...m, rating: ratingValue } : m,
        ),
      );
    } catch (e) {
      showToast("Failed to save rating.");
    }
  };

  const getUserTasteContext = (currentSessionRewatch = false) => {
    const now = Date.now();
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const loved = [],
      disliked = [],
      doNotRecommend = [],
      rewatchable = [];
    let totalDeviation = 0,
      ratedCount = 0;

    historyData.forEach((m) => {
      const rating = m.rating || 0,
        imdbVal = m.imdbRating || 0;
      const isOld = now - (m.timestamp?.toMillis() || now) > NINETY_DAYS_MS;

      if (rating >= 8) loved.push(m.movieTitle);
      if (rating > 0 && rating <= 4) disliked.push(m.movieTitle);

      if (m.watched) {
        if (currentSessionRewatch && rating >= 8 && isOld)
          rewatchable.push(m.movieTitle);
        else doNotRecommend.push(m.movieTitle);
      }

      if (rating > 0 && imdbVal > 0) {
        totalDeviation += Math.abs(rating - imdbVal);
        ratedCount++;
      }
    });

    // Global Baseline Seed Data
    if (ratedCount === 0) {
      return {
        loved: [
          "The Dark Knight",
          "Inception",
          "Dangal",
          "Spider-Man: Into the Spider-Verse",
          "Parasite",
        ],
        disliked: [
          "Cats (2019)",
          "Dragonball Evolution",
          "The Last Airbender",
          "Morbius",
        ],
        doNotRecommend: doNotRecommend,
        rewatchable: [],
        archetype:
          "Global Baseline Viewer (This is a new user with 0 ratings. Assume they have high-quality taste aligning with IMDb Top 250 and critically acclaimed masterpieces. Avoid known bad movies.)",
      };
    }

    let archetype = "New User (Learn their taste over time).";
    if (ratedCount > 0 && ratedCount < 3) {
      archetype =
        "Developing Profile (User is building their taste matrix. Blend mainstream hits with their specific highly-rated genres).";
    } else if (ratedCount >= 3) {
      const avgDeviation = totalDeviation / ratedCount;
      if (avgDeviation < 1.5)
        archetype =
          "Mainstream Matcher (Tends to agree with general audiences. Prioritize universally acclaimed hits).";
      else
        archetype =
          "Niche Critic (Unique taste diverging from IMDb. Give them polarizing films, cult classics, or hidden gems).";
    }

    return { loved, disliked, doNotRecommend, rewatchable, archetype };
  };

  const saveToDatabase = useCallback(
    async (movieToSave, isSurprise) => {
      if (!user) return null;
      setDbStatus("saving");
      try {
        const numericImdb = parseFloat(movieToSave.imdbRating) || 0;
        const docRef = await addDoc(
          collection(
            db,
            "artifacts",
            appId,
            "users",
            user.uid,
            "recommendations",
          ),
          {
            movieTitle: movieToSave.title,
            userAnswers: isSurprise ? { mode: "Surprise Me" } : answers,
            timestamp: serverTimestamp(),
            rating: null,
            watched: false,
            imdbRating: numericImdb,
            reasoning: movieToSave.reasoning || "",
          },
        );
        setDbStatus("saved");
        return docRef.id;
      } catch (error) {
        setDbStatus("error");
        showToast("Error syncing to Vault.");
        return null;
      }
    },
    [user, answers],
  );

  const startCurator = () => {
    setCurrentQIndex(0);
    setAnswers({});
    setIsSurpriseMode(false);
    setAppState("questions");
  };

  const handleSurpriseMe = () => {
    setIsSurpriseMode(true);
    processAnswers({ mode: "Surprise Me" }, true);
  };

  const handleAnswer = (questionKey, value) => {
    const newAnswers = { ...answers, [questionKey]: value };
    setAnswers(newAnswers);
    if (currentQIndex < currentQuestions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      processAnswers(newAnswers, false);
    }
  };

  const processAnswers = async (finalAnswers, surpriseMode = false) => {
    setAppState("loading");
    try {
      const tasteContext = getUserTasteContext(sessionAllowRewatch);
      const result = await fetchMovieRecommendation(
        finalAnswers,
        [],
        sessionSubs,
        tasteContext,
        sessionLanguages,
        surpriseMode,
      );
      const dbId = await saveToDatabase(result, surpriseMode);

      setRecommendationList([{ ...result, id: dbId }]);
      setCurrentResultIndex(0);
      setAppState("result");
    } catch (error) {
      setRecommendationList([
        {
          title: "Error 404: Movie Not Found",
          year: 2024,
          pitch: "Our AI brain got a little too tired. Try again later!",
          reasoning: "Server timeout or overload.",
          platforms: ["Reality"],
          imdbRating: "N/A",
        },
      ]);
      setAppState("result");
    }
  };

  const handleReroll = async () => {
    if (rerollsLeft > 0) {
      setRerollsLeft((prev) => prev - 1);
      setAppState("loading");
      try {
        const previousTitles = recommendationList.map((m) => m.title);
        const tasteContext = getUserTasteContext(sessionAllowRewatch);
        const newResult = await fetchMovieRecommendation(
          isSurpriseMode ? { mode: "Surprise Me" } : answers,
          previousTitles,
          sessionSubs,
          tasteContext,
          sessionLanguages,
          isSurpriseMode,
        );

        const dbId = await saveToDatabase(newResult, isSurpriseMode);
        const newList = [...recommendationList, { ...newResult, id: dbId }];
        setRecommendationList(newList);
        setCurrentResultIndex(newList.length - 1);
        setAppState("result");
      } catch (error) {
        showToast("Reroll failed. Connection issue.");
        setAppState("result");
      }
    }
  };

  const handleWatchedAlready = async () => {
    const currentMovie = recommendationList[currentResultIndex];
    if (currentMovie && currentMovie.id) {
      // Pass false to indicate it is currently unwatched, toggleWatched will set to true
      await toggleWatched(currentMovie.id, false);
      showToast("Marked as Seen! Rerolling...");
    }
    if (rerollsLeft > 0) handleReroll();
    else resetApp();
  };

  const resetApp = () => {
    setAppState("intro");
    setCurrentQIndex(0);
    setAnswers({});
    setRerollsLeft(3);
    setRecommendationList([]);
    setCurrentResultIndex(0);
    setDbStatus("idle");
    setIsSurpriseMode(false);
  };

  const handleShare = (movie) => {
    const textToShare = `🎬 Movie night sorted!\n\nJust got recommended: *${movie.title}* (${movie.year})\n\n"${movie.pitch}"\n\nFound via The Anti-Catalog.`;
    copyToClipboardFallback(textToShare);
    showToast("Pitch copied! Send it to your friends. 🍿");
  };

  // --- UI COMPONENTS ---
  // Premium Liquid Glass Styling Tokens
  const glassPanel =
    "bg-white/[0.02] backdrop-blur-3xl border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.5)]";
  const liquidSpring = { type: "spring", bounce: 0.35, duration: 0.8 };
  const smoothEntrance = {
    opacity: 0,
    scale: 0.9,
    filter: "blur(15px)",
    y: 30,
  };
  const smoothAnimate = { opacity: 1, scale: 1, filter: "blur(0px)", y: 0 };
  const smoothExit = {
    opacity: 0,
    scale: 1.05,
    filter: "blur(15px)",
    y: -30,
    transition: { duration: 0.3 },
  };

  const QuestionCard = ({ title, options, questionKey }) => {
    const progress = (currentQIndex / currentQuestions.length) * 100;

    return (
      <motion.div
        key={questionKey}
        initial={smoothEntrance}
        animate={smoothAnimate}
        exit={smoothExit}
        transition={liquidSpring}
        className="w-full max-w-2xl mx-auto flex flex-col"
      >
        {/* Liquid Progress Bar */}
        <div className="w-full h-2 bg-slate-900/50 rounded-full mb-10 overflow-hidden shadow-inner border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]"
            initial={{
              width: `${((currentQIndex - 1) / currentQuestions.length) * 100}%`,
            }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", bounce: 0.2, duration: 1 }}
          />
        </div>

        <div className={`p-6 md:p-12 rounded-[2.5rem] ${glassPanel}`}>
          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-400 mb-8 md:mb-10 text-center tracking-tight leading-tight drop-shadow-sm">
            {title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <motion.button
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  key={opt.value}
                  onClick={() => handleAnswer(questionKey, opt.value)}
                  className="group flex flex-col items-center justify-center p-6 md:p-8 border border-white/[0.05] rounded-[2rem] bg-slate-800/20 hover:bg-white/[0.05] hover:border-cyan-400/40 hover:shadow-[0_15px_30px_rgba(34,211,238,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-purple-500/0 group-hover:from-cyan-500/10 group-hover:to-purple-500/10 transition-colors duration-500" />
                  <Icon className="w-10 h-10 md:w-12 md:h-12 mb-4 md:mb-5 text-slate-400 group-hover:text-cyan-300 transition-colors duration-500 relative z-10" />
                  <span className="text-lg md:text-xl font-bold text-slate-200 group-hover:text-white relative z-10 transition-colors">
                    {opt.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  };

  const CinematicLoader = () => (
    <motion.div
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      className="flex flex-col items-center justify-center space-y-10"
    >
      <div className="relative flex items-center justify-center">
        {/* Liquid Morphing Orb */}
        <motion.div
          animate={{
            borderRadius: [
              "30% 70% 70% 30% / 30% 30% 70% 70%",
              "70% 30% 30% 70% / 70% 70% 30% 30%",
              "30% 70% 70% 30% / 30% 30% 70% 70%",
            ],
            rotate: 360,
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="w-40 h-40 bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 shadow-[0_0_60px_rgba(168,85,247,0.5)] blur-[2px] absolute"
        />
        <div className="w-36 h-36 bg-slate-900 rounded-full flex items-center justify-center z-10 shadow-inner border border-white/10">
          <Brain className="w-10 h-10 text-white animate-pulse" />
        </div>
      </div>
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-cyan-300 tracking-[0.3em] uppercase text-sm font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
      >
        Synthesizing Vibe...
      </motion.p>
    </motion.div>
  );

  const ResultCard = () => {
    const movie = recommendationList[currentResultIndex];

    if (!movie) return null;

    return (
      <motion.div
        key={movie.title}
        initial={smoothEntrance}
        animate={smoothAnimate}
        transition={liquidSpring}
        className="w-full max-w-3xl mx-auto relative pb-20 md:pb-0"
      >
        {/* Subtle Static Glow Behind Card */}
        <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-blue-500/20 rounded-[3rem] blur-xl z-0" />

        <div
          className={`relative p-6 md:p-12 rounded-[2.5rem] z-10 overflow-hidden ${glassPanel}`}
        >
          <div className="flex flex-col relative z-10">
            {/* Header & Badges */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 md:mb-8">
              <div className="flex-1 w-full">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, ...liquidSpring }}
                  className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-sm break-words"
                >
                  {movie.title}
                </motion.h1>
                <div className="flex flex-wrap items-center gap-3">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, ...liquidSpring }}
                    className="px-4 py-1.5 bg-white/10 text-cyan-300 rounded-full text-sm font-bold border border-white/[0.08] shadow-inner backdrop-blur-md"
                  >
                    {movie.year}
                  </motion.span>
                  {movie.imdbRating && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25, ...liquidSpring }}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full text-sm font-bold border border-yellow-500/20 shadow-inner backdrop-blur-md"
                    >
                      <Star className="w-4 h-4" fill="currentColor" />{" "}
                      {movie.imdbRating}
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Action Buttons (Top Right) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, ...liquidSpring }}
                className="flex gap-2 self-start md:self-auto w-full md:w-auto justify-end"
              >
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + " " + movie.year + " trailer")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all hover:scale-105 border border-red-500/20 flex items-center justify-center group"
                  title="Watch Trailer"
                >
                  {/* <Youtube className="w-5 h-5" /> */}
                </a>
                <button
                  onClick={() => handleShare(movie)}
                  className="p-3 bg-white/[0.05] hover:bg-white/[0.1] text-slate-100 rounded-2xl transition-all hover:scale-105 border border-white/10 flex items-center justify-center group relative"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </motion.div>
            </div>

            {/* Pitch - Enhanced Legibility */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, ...liquidSpring }}
              className="text-lg md:text-xl text-slate-100 leading-relaxed mb-8 font-medium drop-shadow-sm"
            >
              "{movie.pitch}"
            </motion.p>

            {/* AI Insight (Why this movie) */}
            {movie.reasoning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, ...liquidSpring }}
                className="mb-8 p-5 md:p-6 rounded-[1.5rem] bg-purple-500/10 border border-purple-500/20 shadow-inner relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-400" />
                <div className="flex items-start gap-4 relative z-10 pl-2">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-purple-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-widest block mb-1.5">
                      AI Insight
                    </span>
                    <p className="text-sm md:text-base text-purple-50 leading-relaxed font-medium">
                      {movie.reasoning}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Platforms */}
            {/* Platforms */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, ...liquidSpring }}
              className="mb-10"
            >
              <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-bold">
                Available On
              </h3>
              <div className="flex flex-wrap gap-2">
                {/* DEFENSIVE FIX: Fallback to an array if the AI forgets the platforms key */}
                {(movie.platforms || ["Check Local Platforms"]).map(
                  (platform, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-1.5 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-slate-200 shadow-inner backdrop-blur-md"
                    >
                      <Play
                        className="w-3 h-3 text-cyan-400"
                        fill="currentColor"
                      />{" "}
                      {platform}
                    </span>
                  ),
                )}
              </div>
            </motion.div>
            {/* Core Action Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 pt-8 border-t border-white/[0.08]"
            >
              <button
                onClick={resetApp}
                className="flex-1 w-full px-6 py-4 rounded-[1.5rem] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black transition-all shadow-[0_5px_20px_rgba(34,211,238,0.2)] hover:shadow-[0_10px_30px_rgba(34,211,238,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2 text-base md:text-lg"
              >
                Accept <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 md:gap-4 flex-1">
                <button
                  onClick={handleWatchedAlready}
                  disabled={rerollsLeft === 0}
                  className={`flex-1 px-4 py-4 rounded-[1.5rem] border flex items-center justify-center gap-2 transition-all font-bold shadow-inner ${
                    rerollsLeft > 0
                      ? "bg-white/[0.03] border-white/10 text-slate-200 hover:bg-white/[0.08] hover:text-white hover:border-white/30 hover:-translate-y-1"
                      : "border-red-500/20 text-red-500/50 cursor-not-allowed bg-red-500/5"
                  }`}
                >
                  <CheckSquare className="w-5 h-5" /> Seen It
                </button>
                <button
                  onClick={handleReroll}
                  disabled={rerollsLeft === 0}
                  className={`flex-1 px-4 py-4 rounded-[1.5rem] border flex items-center justify-center gap-2 transition-all font-bold shadow-inner ${
                    rerollsLeft > 0
                      ? "bg-white/[0.03] border-white/10 text-slate-200 hover:bg-white/[0.08] hover:text-white hover:border-purple-500/50 hover:-translate-y-1"
                      : "border-red-500/20 text-red-500/50 cursor-not-allowed bg-red-500/5"
                  }`}
                >
                  <RefreshCw
                    className={`w-5 h-5 ${rerollsLeft > 0 ? "animate-none" : ""}`}
                  />{" "}
                  Reroll ({rerollsLeft})
                </button>
              </div>
            </motion.div>

            {/* AI Feedback - Responsive Structured Star Rating */}
            {movie.id && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, ...liquidSpring }}
                className="mt-8 p-5 md:p-6 bg-black/20 rounded-[2rem] flex flex-col xl:flex-row items-center justify-between gap-6 border border-white/[0.05] shadow-inner backdrop-blur-md"
              >
                <div className="text-center xl:text-left w-full xl:w-auto">
                  <div className="text-sm font-bold text-white mb-1">
                    Rate to train your AI
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Helps us map your exact taste archetype.
                  </div>
                </div>

                <div className="flex flex-row flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
                  <div className="flex items-center gap-0.5 bg-black/40 px-3 py-2 rounded-2xl border border-white/10 shadow-inner">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(movie.id, star)}
                        className="p-1 sm:p-1.5 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`w-4 h-4 sm:w-5 sm:h-5 transition-all ${(movie.rating || 0) >= star ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "text-slate-600 hover:text-yellow-400/30"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center bg-black/40 px-5 py-2.5 rounded-2xl border border-white/10 shadow-inner">
                    <span className="font-mono font-black text-yellow-400 text-lg tracking-widest">
                      {movie.rating || 0}
                    </span>
                    <span className="text-slate-500 text-sm ml-0.5 font-bold">
                      /10
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const ProfileView = () => {
    const [isConfirmingClear, setIsConfirmingClear] = useState(false);

    const clearVault = async () => {
      if (!user) return;
      try {
        showToast("Clearing vault...");
        for (const item of historyData) {
          await deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "users",
              user.uid,
              "recommendations",
              item.id,
            ),
          );
        }
        showToast("Vault completely cleared. 🗑️");
        setIsConfirmingClear(false);
      } catch (e) {
        showToast("Error clearing vault.");
      }
    };

    return (
      <motion.div
        initial={smoothEntrance}
        animate={smoothAnimate}
        exit={smoothExit}
        transition={liquidSpring}
        className={`w-full max-w-3xl mx-auto flex flex-col p-6 md:p-10 rounded-[2.5rem] mb-20 ${glassPanel}`}
      >
        <div className="flex items-center gap-6 mb-10 border-b border-white/[0.08] pb-8 flex-wrap">
          {user && !user.isAnonymous && user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-24 h-24 rounded-3xl shadow-xl border border-white/20 object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center shadow-[0_10px_30px_rgba(34,211,238,0.3)]">
              <User className="w-10 h-10 text-white drop-shadow-md" />
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-3xl font-black text-white drop-shadow-sm">
              {user && !user.isAnonymous ? user.displayName : "Guest Explorer"}
            </h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              {user && !user.isAnonymous
                ? user.email
                : "Playing anonymously. Sign in to sync across devices."}
            </p>
          </div>
          <div>
            {user && user.isAnonymous ? (
              <button
                onClick={handleGoogleLogin}
                className="px-6 py-3.5 bg-white text-slate-950 font-black rounded-2xl text-sm flex items-center gap-2 hover:bg-slate-200 hover:-translate-y-1 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.2)]"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  className="w-5 h-5"
                  alt="Google"
                />{" "}
                Sign in with Google
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="px-6 py-3.5 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:-translate-y-1 font-black rounded-2xl text-sm transition-all shadow-inner"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Master Settings Sections */}
        <div className="space-y-12">
          <section>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Settings className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />{" "}
              Master Subscriptions
            </h3>
            <p className="text-sm text-slate-400 mb-6 font-medium">
              Select the services you own. We'll filter global recommendations
              to these.
            </p>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_SUBSCRIPTIONS.map((sub) => (
                <button
                  key={sub}
                  onClick={() => toggleSubscription(sub)}
                  className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${mySubs.includes(sub) ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]" : "bg-black/20 border-white/5 text-slate-400 hover:bg-white/[0.05] hover:border-white/20 shadow-inner"}`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Globe className="w-6 h-6 text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" />{" "}
              Language Baseline
            </h3>
            <div className="flex flex-wrap gap-3 mt-6">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${myLanguages.includes(lang) ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]" : "bg-black/20 border-white/5 text-slate-400 hover:bg-white/[0.05] hover:border-white/20 shadow-inner"}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />{" "}
              Default Accuracy Level
            </h3>
            <div className="flex flex-col md:flex-row gap-4 mt-6">
              {[
                { id: "short", l: "Quick Match", d: "3 Questions" },
                { id: "medium", l: "Vibe Check", d: "5 Questions" },
                { id: "long", l: "Deep Dive", d: "7 Questions" },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => toggleSurveyLength(lvl.id)}
                  className={`flex-1 py-5 rounded-[2rem] flex flex-col items-center justify-center gap-1 border transition-all ${surveyLength === lvl.id ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.15),inset_0_1px_1px_rgba(255,255,255,0.1)]" : "bg-black/20 border-white/5 text-slate-500 hover:bg-white/[0.05] hover:border-white/20 shadow-inner"}`}
                >
                  <span className="font-black text-lg">{lvl.l}</span>
                  <span className="text-xs font-bold opacity-70">{lvl.d}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Data Management - Danger Zone */}
          <section className="pt-10 border-t border-red-500/20">
            <h3 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]">
              <Trash2 className="w-6 h-6" /> Danger Zone
            </h3>
            <p className="text-sm text-slate-400 mb-6 font-medium">
              Manage your data and privacy. This action cannot be undone.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-red-950/30 border border-red-500/20 p-6 rounded-[2rem] shadow-inner">
              <div>
                <h4 className="font-black text-slate-200 text-center md:text-left">
                  Clear Vault History
                </h4>
                <p className="text-sm text-slate-400 mt-1 max-w-sm text-center md:text-left font-medium">
                  Permanently delete all your generated recommendations,
                  ratings, and watched statuses.
                </p>
              </div>
              {isConfirmingClear ? (
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="flex-1 md:flex-none px-5 py-3.5 md:py-3 text-sm font-bold text-slate-300 hover:text-white transition-colors bg-white/[0.05] rounded-2xl border border-white/10 shadow-inner"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={clearVault}
                    className="flex-1 md:flex-none px-5 py-3.5 md:py-3 bg-red-500 hover:bg-red-400 text-white text-sm font-black rounded-2xl transition-all shadow-[0_10px_20px_rgba(239,68,68,0.3)] hover:-translate-y-1 whitespace-nowrap"
                  >
                    Yes, Delete All
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingClear(true)}
                  className="w-full md:w-auto px-6 py-3.5 md:py-3 border border-red-500/40 text-red-400 hover:bg-red-500/20 text-sm font-black rounded-2xl transition-all hover:-translate-y-1 whitespace-nowrap shadow-inner"
                >
                  Clear History
                </button>
              )}
            </div>
          </section>
        </div>
      </motion.div>
    );
  };

  const HistoryView = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMode, setFilterMode] = useState("all");

    const filteredHistory = historyData.filter((item) => {
      const matchesSearch = item.movieTitle
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "watched" && item.watched) ||
        (filterMode === "unwatched" && !item.watched) ||
        (filterMode === "loved" && item.rating >= 8);
      return matchesSearch && matchesFilter;
    });

    return (
      <motion.div
        initial={smoothEntrance}
        animate={smoothAnimate}
        exit={smoothExit}
        transition={liquidSpring}
        className="w-full max-w-4xl mx-auto flex flex-col mt-6 mb-24 px-4"
      >
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black text-white flex items-center gap-3 mb-2 drop-shadow-sm">
              <History className="w-10 h-10 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />{" "}
              Vault
            </h2>
            <p className="text-slate-400 font-medium">
              Your personal cinematic timeline.
            </p>
          </div>
          <span className="text-cyan-300 font-mono font-black text-sm bg-cyan-500/10 px-5 py-2.5 rounded-2xl border border-cyan-500/20 shadow-inner backdrop-blur-md">
            {filteredHistory.length} Entries
          </span>
        </div>

        {/* Vault Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 w-full">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search your movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${glassPanel} rounded-2xl py-4 pl-14 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all font-medium focus:shadow-[0_0_20px_rgba(34,211,238,0.15),inset_0_1px_1px_rgba(255,255,255,0.1)]`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar items-center">
            {[
              { id: "all", label: "All" },
              { id: "watched", label: "Watched" },
              { id: "unwatched", label: "Unwatched" },
              { id: "loved", label: "Loved (8+)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                className={`px-6 py-4 rounded-2xl text-sm font-black whitespace-nowrap transition-all border shadow-inner ${filterMode === f.id ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "bg-black/20 border-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div
            className={`text-center p-12 md:p-16 rounded-[3rem] flex flex-col items-center mt-4 ${glassPanel}`}
          >
            <Film className="w-16 h-16 md:w-20 md:h-20 text-slate-600 mb-6 drop-shadow-md" />
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
              No movies found
            </h3>
            <p className="text-sm md:text-base text-slate-400 font-medium max-w-sm leading-relaxed">
              Try adjusting your search terms or filters, or head back to the
              Curator to find something new!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {filteredHistory.map((item) => (
              <motion.div
                whileHover={{ y: -5 }}
                key={item.id}
                className={`p-6 md:p-8 rounded-[2.5rem] transition-all flex flex-col justify-between gap-6 relative overflow-hidden ${glassPanel} ${item.watched ? "opacity-75" : "hover:border-cyan-400/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)]"}`}
              >
                {item.watched && (
                  <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-bl from-green-500/20 to-transparent rounded-bl-[4rem] flex items-top justify-end p-4">
                    <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="text-xl md:text-2xl font-black text-white pr-10 drop-shadow-sm leading-tight break-words">
                      {item.movieTitle}
                    </h4>
                    {item.imdbRating && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-xl text-xs font-black border border-yellow-500/20 whitespace-nowrap shadow-inner backdrop-blur-md">
                        <Star className="w-3 h-3" fill="currentColor" />{" "}
                        {item.imdbRating}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex flex-wrap gap-2">
                    <span className="bg-white/5 px-2 py-1 rounded-md">
                      {item.userAnswers?.mode
                        ? "Surprise!"
                        : item.userAnswers?.q2 || "Random"}
                    </span>{" "}
                    •{" "}
                    <span className="px-2 py-1">
                      {new Date(
                        item.timestamp?.toMillis() || Date.now(),
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-6 pt-4 border-t border-white/[0.05]">
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Your Rating
                    </span>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex items-center gap-0.5 bg-black/40 px-2 py-1.5 rounded-xl border border-white/10 shadow-inner">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRating(item.id, star)}
                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                          >
                            <Star
                              className={`w-4 h-4 sm:w-4 sm:h-4 transition-all ${(item.rating || 0) >= star ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" : "text-slate-600 hover:text-yellow-400/30"}`}
                            />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-center bg-black/40 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                        <span className="font-mono font-black text-yellow-400 text-sm">
                          {item.rating || 0}
                        </span>
                        <span className="text-slate-500 text-xs ml-0.5 font-bold">
                          /10
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleWatched(item.id, item.watched)}
                    className={`flex items-center justify-center gap-2 px-5 py-3 md:py-3.5 rounded-2xl text-sm font-black transition-all border w-full sm:w-auto self-start shadow-inner ${item.watched ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05]" : "border-cyan-500/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"}`}
                  >
                    {item.watched ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}{" "}
                    {item.watched ? "Remove from Watched" : "Mark as Watched"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const StatsView = () => {
    // --- Data Computations ---
    const totalRecommendations = historyData.length;
    const ratedMovies = historyData.filter((m) => m.rating > 0);
    const watchedMovies = historyData.filter((m) => m.watched).length;

    // AI Accuracy (Avg Rating out of 10 -> Percentage)
    const avgRating =
      ratedMovies.length > 0
        ? ratedMovies.reduce((acc, m) => acc + m.rating, 0) / ratedMovies.length
        : 0;
    const aiAccuracy =
      ratedMovies.length > 0 ? Math.round((avgRating / 10) * 100) : 0;

    // Vibe Distribution
    const vibeCounts = historyData.reduce((acc, m) => {
      const vibe = m.userAnswers?.mode
        ? "Surprise"
        : m.userAnswers?.q2 || "Random";
      acc[vibe] = (acc[vibe] || 0) + 1;
      return acc;
    }, {});

    // Calculate Archetype & IMDb Deviation
    let totalDeviation = 0;
    let validDeviationCount = 0;
    historyData.forEach((m) => {
      if (m.rating > 0 && m.imdbRating > 0) {
        totalDeviation += Math.abs(m.rating - m.imdbRating);
        validDeviationCount++;
      }
    });

    const avgDeviation =
      validDeviationCount > 0
        ? (totalDeviation / validDeviationCount).toFixed(1)
        : "N/A";

    let archetype = "Global Baseline";
    let archetypeDesc =
      "Using global seed data. Rate movies to build your custom neural profile.";

    if (validDeviationCount > 0 && validDeviationCount < 3) {
      archetype = "Developing Profile";
      archetypeDesc = `We need ${3 - validDeviationCount} more ratings to determine your exact IMDb divergence.`;
    } else if (validDeviationCount >= 3) {
      if (avgDeviation < 1.5) {
        archetype = "Mainstream Matcher";
        archetypeDesc =
          "Your taste aligns closely with global audiences and IMDb consensus.";
      } else {
        archetype = "Niche Critic";
        archetypeDesc =
          "You have a highly unique, contrarian taste that diverges from the mainstream.";
      }
    }

    return (
      <motion.div
        initial={smoothEntrance}
        animate={smoothAnimate}
        exit={smoothExit}
        transition={liquidSpring}
        className="w-full max-w-5xl mx-auto flex flex-col mt-6 mb-24 px-4"
      >
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black text-white flex items-center gap-3 mb-2 drop-shadow-sm">
              <BarChart3 className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />{" "}
              Neural Stats
            </h2>
            <p className="text-slate-400 font-medium">
              Deep analytics on your taste and AI performance.
            </p>
          </div>
        </div>

        {totalRecommendations === 0 ? (
          <div
            className={`text-center p-12 md:p-16 rounded-[3rem] flex flex-col items-center mt-4 ${glassPanel}`}
          >
            <Activity className="w-16 h-16 md:w-20 md:h-20 text-slate-600 mb-6 drop-shadow-md" />
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
              No Data Yet
            </h3>
            <p className="text-sm md:text-base text-slate-400 font-medium max-w-sm leading-relaxed">
              The AI needs you to generate and rate movies to build your neural
              profile.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top Row: Core Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Accuracy Card */}
              <div
                className={`col-span-1 md:col-span-2 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 ${glassPanel} relative overflow-hidden`}
              >
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/20 blur-[50px] rounded-full" />
                <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-slate-800"
                      strokeWidth="12"
                      fill="none"
                    />
                    <motion.circle
                      initial={{ strokeDasharray: "0 1000" }}
                      animate={{
                        strokeDasharray: `${(aiAccuracy / 100) * 377} 1000`,
                      }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-cyan-400"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white drop-shadow-md">
                      {aiAccuracy}%
                    </span>
                  </div>
                </div>
                <div className="text-center md:text-left z-10">
                  <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
                    <Target className="w-4 h-4" /> AI Accuracy Score
                  </h3>
                  <h4 className="text-2xl font-black text-white mb-2">
                    Model Precision
                  </h4>
                  <p className="text-slate-300 font-medium text-sm leading-relaxed max-w-sm">
                    Based on your personal ratings, our curator predicts your
                    exact taste with {aiAccuracy}% accuracy. Keep rating movies
                    to push this to 100%.
                  </p>
                </div>
              </div>

              {/* Volume Stats */}
              <div
                className={`p-8 rounded-[2.5rem] flex flex-col justify-center gap-6 ${glassPanel}`}
              >
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Total Generated
                  </span>
                  <span className="text-4xl font-black text-white">
                    {totalRecommendations}
                  </span>
                </div>
                <div className="w-full h-px bg-white/10" />
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Marked Watched
                  </span>
                  <span className="text-4xl font-black text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                    {watchedMovies}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Archetype & Vibes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Archetype Matrix */}
              <div
                className={`p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel}`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[40px] rounded-full" />
                <h3 className="text-sm font-black text-yellow-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Brain className="w-4 h-4" /> Your Cinematic Archetype
                </h3>
                <div className="mb-6">
                  <h4 className="text-3xl font-black text-white mb-3 drop-shadow-sm">
                    {archetype}
                  </h4>
                  <p className="text-slate-300 text-sm font-medium leading-relaxed">
                    {archetypeDesc}
                  </p>
                </div>
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-bold text-slate-300">
                      Avg. Deviation from IMDb
                    </span>
                  </div>
                  <span className="font-mono font-black text-yellow-400 text-xl">
                    {avgDeviation}{" "}
                    <span className="text-xs text-slate-500">pts</span>
                  </span>
                </div>
              </div>

              {/* Vibe Matrix */}
              <div className={`p-8 rounded-[2.5rem] ${glassPanel}`}>
                <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <PieChart className="w-4 h-4" /> The Vibe Matrix
                </h3>
                <div className="space-y-4">
                  {Object.entries(vibeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([vibe, count], index) => {
                      const pct = Math.round(
                        (count / totalRecommendations) * 100,
                      );
                      return (
                        <div key={vibe} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-white capitalize">
                              {vibe}
                            </span>
                            <span className="text-slate-400">{pct}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden shadow-inner border border-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{
                                duration: 1,
                                delay: index * 0.1,
                                type: "spring",
                              }}
                              className={`h-full rounded-full ${index === 0 ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" : index === 1 ? "bg-cyan-500" : "bg-slate-500"}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30 flex flex-col relative overflow-hidden">
      {/* Premium Static/Slow Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-slate-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] rounded-full bg-purple-900/10 blur-[120px]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-cyan-900/10 blur-[140px]"
        />
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[40px] z-0" />
      </div>

      {/* Production Toast Notification System */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(10px)" }}
            transition={liquidSpring}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white/[0.05] backdrop-blur-2xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] px-6 py-4 rounded-full flex items-center gap-3 w-max max-w-[90vw]"
          >
            <Bell className="w-5 h-5 text-cyan-400 flex-shrink-0 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
            <span className="font-bold text-sm text-white drop-shadow-sm">
              {toastMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pill Navigation */}
      <nav className="fixed bottom-6 md:bottom-auto md:top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-white/[0.03] backdrop-blur-3xl border border-white/[0.08] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_50px_rgba(0,0,0,0.5)] overflow-x-auto max-w-[95vw] no-scrollbar">
        <button
          onClick={() => {
            setCurrentView("home");
            resetApp();
          }}
          className={`flex-shrink-0 px-6 py-3 rounded-full text-sm font-black transition-all duration-300 flex items-center gap-2 ${currentView === "home" ? "bg-white text-slate-950 shadow-[0_5px_15px_rgba(255,255,255,0.2)]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
        >
          <Film className="w-4 h-4" />{" "}
          <span className="hidden sm:inline">Curator</span>
        </button>
        <button
          onClick={() => setCurrentView("history")}
          className={`flex-shrink-0 px-6 py-3 rounded-full text-sm font-black transition-all duration-300 flex items-center gap-2 ${currentView === "history" ? "bg-white text-slate-950 shadow-[0_5px_15px_rgba(255,255,255,0.2)]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
        >
          <History className="w-4 h-4" />{" "}
          <span className="hidden sm:inline">Vault</span>
        </button>
        <button
          onClick={() => setCurrentView("stats")}
          className={`flex-shrink-0 px-6 py-3 rounded-full text-sm font-black transition-all duration-300 flex items-center gap-2 ${currentView === "stats" ? "bg-white text-slate-950 shadow-[0_5px_15px_rgba(255,255,255,0.2)]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
        >
          <BarChart3 className="w-4 h-4" />{" "}
          <span className="hidden sm:inline">Stats</span>
        </button>
        <button
          onClick={() => setCurrentView("profile")}
          className={`flex-shrink-0 px-6 py-3 rounded-full text-sm font-black transition-all duration-300 flex items-center gap-2 ${currentView === "profile" ? "bg-white text-slate-950 shadow-[0_5px_15px_rgba(255,255,255,0.2)]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
        >
          {user && !user.isAnonymous && user.photoURL ? (
            <img
              src={user.photoURL}
              alt="User"
              className="w-5 h-5 rounded-full object-cover border border-white/20"
            />
          ) : (
            <User className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Profile</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col px-4 md:px-8 relative z-10 overflow-y-auto no-scrollbar pt-8 md:pt-36 pb-32 md:pb-8">
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {currentView === "profile" && <ProfileView key="profileView" />}
            {currentView === "history" && <HistoryView key="historyView" />}
            {currentView === "stats" && <StatsView key="statsView" />}

            {currentView === "home" && appState === "intro" && (
              <motion.div
                key="intro"
                initial={smoothEntrance}
                animate={smoothAnimate}
                exit={smoothExit}
                transition={liquidSpring}
                className="w-full max-w-3xl mx-auto flex flex-col items-center"
              >
                <div className="text-center mb-10 md:mb-14">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, ...liquidSpring }}
                    className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-white/[0.03] backdrop-blur-md border border-white/10 text-cyan-300 font-black text-[10px] md:text-xs uppercase tracking-widest mb-6 md:mb-8 shadow-inner"
                  >
                    <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />{" "}
                    AI-Powered Curation
                  </motion.div>
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 md:mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-100 to-slate-400 tracking-tighter leading-[1.1] drop-shadow-sm px-2">
                    Don't Scroll.
                    <br />
                    Just Watch.
                  </h1>
                  <p className="text-lg md:text-xl lg:text-2xl text-slate-300 font-medium max-w-xl mx-auto leading-relaxed drop-shadow-sm px-4">
                    Answer{" "}
                    {sessionSurveyLength === "long"
                      ? "seven"
                      : sessionSurveyLength === "medium"
                        ? "five"
                        : "three"}{" "}
                    vibe-check questions. Get exactly one cinematic masterpiece
                    tailored to your mood.
                  </p>
                </div>

                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-5 w-full justify-center mb-12">
                  <button
                    onClick={startCurator}
                    className="w-full sm:w-auto group relative inline-flex items-center justify-center px-10 py-5 font-black text-slate-950 bg-white rounded-[2rem] overflow-hidden transition-all hover:scale-105 active:scale-95 text-lg shadow-[0_10px_40px_rgba(255,255,255,0.2)]"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Start Curator{" "}
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                    </span>
                  </button>
                  <button
                    onClick={handleSurpriseMe}
                    className={`w-full sm:w-auto group inline-flex items-center justify-center px-8 py-5 font-bold text-white rounded-[2rem] transition-all hover:scale-105 active:scale-95 text-lg hover:border-purple-400/50 hover:shadow-[0_10px_30px_rgba(168,85,247,0.3)] ${glassPanel}`}
                  >
                    <Zap className="w-5 h-5 mr-2 text-purple-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" />{" "}
                    Surprise Me
                  </button>
                </div>

                {/* Session Override Settings */}
                <div
                  className={`w-full max-w-xl rounded-[2.5rem] p-3 transition-all ${glassPanel}`}
                >
                  <button
                    onClick={() => setShowSessionSettings(!showSessionSettings)}
                    className="w-full flex items-center justify-between text-slate-300 hover:text-white font-black p-5 rounded-[1.5rem] hover:bg-white/[0.05] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Settings2 className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />{" "}
                      Adjust This Session
                    </span>
                    <ChevronRight
                      className={`w-6 h-6 transition-transform ${showSessionSettings ? "rotate-90" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showSessionSettings && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden px-5 pb-5"
                      >
                        <div className="pt-6 space-y-8 border-t border-white/[0.08] mt-2">
                          <div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest mb-4 font-black">
                              Streaming Limits
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {AVAILABLE_SUBSCRIPTIONS.map((sub) => (
                                <button
                                  key={sub}
                                  onClick={() => toggleSessionSub(sub)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${sessionSubs.includes(sub) ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-inner" : "bg-black/40 border-white/5 text-slate-500 hover:bg-white/[0.05]"}`}
                                >
                                  {sub}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest mb-4 font-black">
                              Languages
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {AVAILABLE_LANGUAGES.map((lang) => (
                                <button
                                  key={lang}
                                  onClick={() => toggleSessionLanguage(lang)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${sessionLanguages.includes(lang) ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow-inner" : "bg-black/40 border-white/5 text-slate-500 hover:bg-white/[0.05]"}`}
                                >
                                  {lang}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest mb-4 font-black">
                              Accuracy Level
                            </div>
                            <div className="flex gap-2 bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
                              {[
                                { id: "short", l: "Quick" },
                                { id: "medium", l: "Vibe" },
                                { id: "long", l: "Deep" },
                              ].map((lvl) => (
                                <button
                                  key={lvl.id}
                                  onClick={() => setSessionSurveyLength(lvl.id)}
                                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${sessionSurveyLength === lvl.id ? "bg-white text-slate-950 shadow-md" : "text-slate-500 hover:text-white"}`}
                                >
                                  {lvl.l}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {currentView === "home" && appState === "questions" && (
              <QuestionCard
                key={currentQuestions[currentQIndex].key}
                questionKey={currentQuestions[currentQIndex].key}
                title={currentQuestions[currentQIndex].title}
                options={currentQuestions[currentQIndex].options}
              />
            )}

            {currentView === "home" && appState === "loading" && (
              <CinematicLoader key="loader" />
            )}
            {currentView === "home" && appState === "result" && (
              <ResultCard key="result" />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
