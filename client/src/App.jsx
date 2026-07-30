import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  DoorOpen,
  Eye,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Users,
  Image as ImageIcon,
  Trash2,
  Pencil,
  X,
  XCircle
} from "lucide-react";
import { compressImage } from "./lib/imageUtils.js";
import ActionButton from "./components/ActionButton.jsx";
import Logo from "./components/Logo.jsx";
import ProgressHeader from "./components/ProgressHeader.jsx";
import { createSocket, saveSession, loadSession, clearSession } from "./lib/socket.js";
import { useCountdown } from "./hooks/useCountdown.js";
import { GAALI_BANK } from "./lib/gaaliBank.js";

const serverUrl = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

const relationships = [
  { type: "romantic", label: "BF/GF or partners", description: "Emotionally and physically close. One wrong truth can start a fire." },
  { type: "friends", label: "Friends", description: "You think you know them. Everyone hides something from the people they eat lunch with." },
  { type: "best_friends", label: "Best friends", description: "You know their darkest side — or you think you do. Best friends keep the sharpest secrets." },
  { type: "close_friends", label: "Close friends", description: "Close enough to hurt each other. Close enough to know exactly where to push." },
  { type: "brother_sister", label: "Brother & Sister", description: "Blood ties, shared walls, unspoken boundaries. Some things siblings never say — until now." },
  { type: "mentor_friend", label: "Mentor and friend", description: "Respect, hierarchy, and the things you hide from the person you look up to." },
  { type: "just_close", label: "Just close to each other", description: "Undefined. Intense. You don't know where the line is — and that's the point." }
];

function vibrate(pattern = 18) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function normalizePathScreen() {
  return window.location.pathname.startsWith("/admin") ? "admin" : "lobby";
}

function App() {
  const socketRef = useRef(null);
  const [screen, setScreen] = useState(normalizePathScreen);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [playersCount, setPlayersCount] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [relationshipType, setRelationshipType] = useState("close_friends");
  const [maxRounds, setMaxRounds] = useState(5);
  const [roundState, setRoundState] = useState(null);
  const [finalMetrics, setFinalMetrics] = useState(null);
  const [roundHistory, setRoundHistory] = useState([]);
  const [resultsMeta, setResultsMeta] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  // Gaali modal: { emoji, text, playerName } | null
  const [gaaaliModal, setGaaaliModal] = useState(null);
  // Platform round: has the current player submitted their answer?
  const [platformAnswered, setPlatformAnswered] = useState(false);

  useEffect(() => {
    if (screen === "admin") {
      window.history.replaceState(null, "", "/admin");
      return;
    }
    const nextPath = screen === "results" ? "/results" : ["lobby", "waiting"].includes(screen) ? "/lobby" : "/play";
    window.history.replaceState(null, "", nextPath);
  }, [screen]);

  useEffect(() => {
    if (normalizePathScreen() === "admin") return undefined;

    const activeSocket = createSocket();
    socketRef.current = activeSocket;

    function acceptRoundState(payload) {
      setRoundState(payload);
      setRoomCode(payload.roomCode);
      setIsSubmitting(false);
      setChatMessages(payload.chatMessages ?? []);
      if (!["lobby", "waiting", "results"].includes(screen)) {
        // already in game
      }
      setScreen("play");
      vibrate([10, 20, 10]);
    }

    activeSocket.on("room_created", ({ roomCode: code }) => {
      setRoomCode(code);
      setScreen("waiting");
      setError("");
      // "host" slot — save so a refresh can rejoin the waiting room later
      // (only useful once game starts, but safe to save now)
      saveSession(code, "host");
      vibrate();
    });

    activeSocket.on("joined_room", ({ roomCode: code }) => {
      setRoomCode(code);
      setError("");
      saveSession(code, "guest");
      vibrate();
    });

    activeSocket.on("player_joined", ({ playersCount: count }) => setPlayersCount(count));

    activeSocket.on("game_started",   acceptRoundState);
    activeSocket.on("prompts_ready",  acceptRoundState);
    activeSocket.on("answers_ready",  acceptRoundState);
    activeSocket.on("guess_submitted", acceptRoundState);
    activeSocket.on("round_reveal",   acceptRoundState);

    activeSocket.on("game_over", ({ finalMetrics: metrics, roundHistory: history, players }) => {
      setFinalMetrics(metrics);
      setRoundHistory(history);
      setResultsMeta({ players });
      setScreen("results");
      setIsSubmitting(false);
      vibrate([30, 40, 30]);
    });

    activeSocket.on("player_disconnected", () => {
      clearSession();
      setError("Your opponent's connection dropped. They may rejoin. Create a new room if needed.");
      setScreen("lobby");
      setPlayersCount(0);
      setRoomCode("");
      setRoundState(null);
      setChatMessages([]);
    });

    // Intentional exit by the other player
    activeSocket.on("player_left", () => {
      clearSession();
      setError("Your opponent left the game. The session has ended.");
      setScreen("lobby");
      setPlayersCount(0);
      setRoomCode("");
      setRoundState(null);
      setChatMessages([]);
    });

    // Restore state after a page refresh inside an active game
    activeSocket.on("round_state_resumed", (payload) => {
      acceptRoundState(payload);
    });

    // Attempt to rejoin a previous session if a token exists
    const saved = loadSession();
    if (saved) {
      // Set a flag — if server replies with error, wipe the saved session
      activeSocket.once("game_error", () => clearSession());
      activeSocket.emit("rejoin_room", { roomCode: saved.roomCode, slot: saved.slot });
    }

    // Platform round: one player submitted, waiting for the other
    activeSocket.on("platform_answer_ready", (payload) => {
      setRoundState(payload);
      setRoomCode(payload.roomCode);
    });

    // Platform round: both answered — show reveal
    activeSocket.on("platform_reveal", (payload) => {
      acceptRoundState(payload);
      setPlatformAnswered(false);
    });

    // Phase auto-advanced after timer timeout
    activeSocket.on("phase_advanced", (payload) => {
      acceptRoundState(payload);
    });

    // Honesty judgment stored — update round state
    activeSocket.on("honesty_judged", (payload) => {
      setRoundState(payload);
      setRoomCode(payload.roomCode);
    });

    // A gaali was assigned (our own or partner's)
    activeSocket.on("gaali_assigned", ({ gaaliText }) => {
      // Only show the modal to the person who timed out (they emitted it)
      // The server re-broadcasts it — we only pop the modal if it's our own slot
      // We use the gaaaliModal state set locally in onExpire, so this is a no-op
    });

    activeSocket.on("game_error", ({ message }) => {
      setError(message);
      setIsSubmitting(false);
    });

    activeSocket.on("chat_message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      if (!chatOpen) setChatUnread((n) => n + 1);
    });

    return () => activeSocket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roomReady = useMemo(() => joinCode.trim().length === 6, [joinCode]);
  const nameReady = useMemo(() => playerName.trim().length >= 2, [playerName]);

  function resetLocalState() {
    clearSession();
    setScreen("lobby");
    setRoomCode("");
    setJoinCode("");
    setPlayersCount(0);
    setRoundState(null);
    setFinalMetrics(null);
    setRoundHistory([]);
    setResultsMeta(null);
    setError("");
    setIsSubmitting(false);
    setChatMessages([]);
    setChatOpen(false);
    setChatUnread(0);
  }

  function createRoom() {
    if (!nameReady) { setError("Enter your name first."); return; }
    setError("");
    socketRef.current?.emit("create_room", { playerName: playerName.trim(), relationshipType, maxRounds });
  }

  function joinRoom(event) {
    event.preventDefault();
    if (!roomReady) { setError("Enter a valid 6-digit room code."); return; }
    setError("");
    socketRef.current?.emit("join_room", { roomCode: joinCode.trim(), playerName: playerName.trim(), relationshipType });
  }

  function submitRoundPrompts(prompts) {
    setIsSubmitting(true);
    setError("");
    socketRef.current?.emit("submit_round_prompts", { roomCode, prompts });
  }

  function submitTargetAnswers(targetAnswers, lieIndex, targetAnswerImages) {
    setIsSubmitting(true);
    setError("");
    socketRef.current?.emit("submit_target_answers", { roomCode, targetAnswers, targetAnswerImages, lieIndex });
  }

  function submitObserverGuess(guessedLieIndex) {
    setIsSubmitting(true);
    setError("");
    socketRef.current?.emit("submit_observer_guess", { roomCode, guessedLieIndex });
  }

  function submitTargetExplanation(explanation) {
    setIsSubmitting(true);
    setError("");
    socketRef.current?.emit("submit_target_explanation", { roomCode, explanation });
  }

  function nextRound() {
    setIsSubmitting(true);
    setPlatformAnswered(false);
    socketRef.current?.emit("next_round", { roomCode });
  }

  function submitPlatformAnswer(answer, image) {
    setIsSubmitting(true);
    setPlatformAnswered(true);
    socketRef.current?.emit("submit_platform_answer", { roomCode, answer, image });
    setIsSubmitting(false);
  }

  function submitHonestyJudgment(verdict) {
    socketRef.current?.emit("submit_honesty_judgment", { roomCode, verdict });
  }

  function handleTimerExpiry(phase) {
    // Pick a random gaali for this player
    const gaali = GAALI_BANK[Math.floor(Math.random() * GAALI_BANK.length)];
    const playerName = roundState?.players?.[roundState?.mySlot]?.name ?? "You";
    setGaaaliModal({ ...gaali, playerName });
    socketRef.current?.emit("timer_timeout", { roomCode, phase, gaaliText: `${gaali.emoji} ${gaali.text}` });
  }

  function saveDoodle(image, phase) {
    socketRef.current?.emit("save_doodle", { roomCode, image, phase, playerName });
  }

  function sendChat(text) {
    const senderName = roundState?.players?.[roundState?.mySlot]?.name || playerName;
    socketRef.current?.emit("send_chat", { roomCode, text, senderName });
  }

  function openChat() {
    setChatOpen(true);
    setChatUnread(0);
  }

  if (screen === "admin") {
    return <AdminDashboard onExit={() => { window.location.href = "/lobby"; }} />;
  }

  const inGame = ["play", "results"].includes(screen);

  return (
    <main className="min-h-screen text-white">
      <AnimatePresence mode="wait">
        {["lobby", "waiting"].includes(screen) && (
          <LobbyScreen
            key="lobby"
            screen={screen}
            roomCode={roomCode}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            roomReady={roomReady}
            playersCount={playersCount}
            error={error}
            playerName={playerName}
            setPlayerName={setPlayerName}
            relationshipType={relationshipType}
            setRelationshipType={setRelationshipType}
            maxRounds={maxRounds}
            setMaxRounds={setMaxRounds}
            nameReady={nameReady}
            onCreate={createRoom}
            onJoin={joinRoom}
          />
        )}

        {screen === "play" && roundState && (
          <PlayScreen
            key={`${roundState.roundNumber}-${roundState.phase}`}
            roomCode={roomCode}
            roundState={roundState}
            isSubmitting={isSubmitting}
            platformAnswered={platformAnswered}
            error={error}
            onSubmitPrompts={submitRoundPrompts}
            onSubmitAnswers={submitTargetAnswers}
            onSubmitGuess={submitObserverGuess}
            onSubmitExplanation={submitTargetExplanation}
            onSubmitPlatformAnswer={submitPlatformAnswer}
            onHonestyJudgment={submitHonestyJudgment}
            onNextRound={nextRound}
            onTimerExpiry={handleTimerExpiry}
            onDoodleSaved={saveDoodle}
            onExit={() => {
              clearSession();
              socketRef.current?.emit("leave_game", { roomCode });
              setScreen("lobby");
              setRoomCode("");
              setRoundState(null);
            }}
          />
        )}

        {screen === "results" && finalMetrics && (
          <ResultsScreen
            key="results"
            finalMetrics={finalMetrics}
            roundHistory={roundHistory}
            resultsMeta={resultsMeta}
            onPlayAgain={resetLocalState}
          />
        )}
      </AnimatePresence>

      {/* Floating Chat — myName derived from roundState so it matches what server stored */}
      {inGame && (
        <ChatWidget
          open={chatOpen}
          onOpen={openChat}
          onClose={() => setChatOpen(false)}
          messages={chatMessages}
          unread={chatUnread}
          onSend={sendChat}
          myName={roundState ? (roundState.players?.[roundState.mySlot]?.name ?? playerName) : playerName}
        />
      )}

      {/* Gaali poster modal */}
      <AnimatePresence>
        {gaaaliModal && (
          <GaaaliPoster
            emoji={gaaaliModal.emoji}
            text={gaaaliModal.text}
            playerName={gaaaliModal.playerName}
            onClose={() => setGaaaliModal(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ─── Shell ─────────────────────────────────────────────────────────────────── */
function PageShell({ children, className = "" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-4 sm:px-6 overflow-x-hidden ${className}`}
    >
      {children}
    </motion.section>
  );
}

function TextInput(props) {
  return (
    <input
      className="focus-ring touch-target w-full max-w-full rounded-lg border border-white/12 bg-black/25 px-3 py-2 text-white placeholder:text-white/30 text-base sm:px-4 sm:text-sm"
      {...props}
    />
  );
}

/* ─── Lobby ──────────────────────────────────────────────────────────────────── */
function LobbyScreen({ screen, roomCode, joinCode, setJoinCode, roomReady, playersCount, error, playerName, setPlayerName, relationshipType, setRelationshipType, maxRounds, setMaxRounds, nameReady, onCreate, onJoin }) {
  // Track whether joiner has explicitly picked their relationship
  const [joinStep, setJoinStep] = useState("code"); // "code" | "signal"
  const canProceedToSignal = roomReady && nameReady;

  function handleJoin(event) {
    event.preventDefault();
    if (joinStep === "code") {
      if (!canProceedToSignal) return;
      setJoinStep("signal");
    } else {
      onJoin(event);
    }
  }

  return (
    <PageShell className="justify-center gap-4 sm:gap-6">
      <Logo />
      <div className="mx-auto w-full max-w-4xl min-w-0">
        <section className="glass-panel mb-4 rounded-xl p-3.5 sm:p-5 w-full min-w-0">
          <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr] items-start w-full min-w-0">
            <div className="w-full min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Identity</p>
              <TextInput value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" aria-label="Your name" />
            </div>
            <div className="w-full min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">Your Private Signal</p>
              <RelationshipPicker value={relationshipType} onChange={setRelationshipType} />
              <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-emerald/40 bg-emerald/10 px-2.5 py-2 shadow-[0_0_18px_rgba(16,185,129,0.12)] min-w-0">
                <Shield size={14} className="shrink-0 text-emerald" aria-hidden="true" />
                <p className="text-xs leading-4 min-w-0 break-words">
                  <span className="font-semibold text-emerald inline-block mr-1">Only visible to you</span>
                  <span className="text-white/55">— the other player will never see your choice</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 w-full min-w-0">
          {/* Create Room */}
          <motion.div whileHover={{ y: -2 }} className="glass-panel rounded-xl p-4 sm:p-6 w-full min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-cyan">Start</p>
                <h1 className="mt-1 text-xl sm:text-2xl font-semibold text-white truncate">Create Private Room</h1>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-cyan/14 text-cyan">
                <Plus size={22} aria-hidden="true" />
              </div>
            </div>
            <div className="mb-4 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/50">Game Length</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMaxRounds(5)} className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition ${maxRounds === 5 ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"}`}>
                  <span className="text-sm font-semibold">5 Rounds</span>
                  <span className="text-[10px] uppercase opacity-70">Quick Session</span>
                </button>
                <button type="button" onClick={() => setMaxRounds(10)} className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition ${maxRounds === 10 ? "border-violet/50 bg-violet/10 text-violet" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"}`}>
                  <span className="text-sm font-semibold">10 Rounds</span>
                  <span className="text-[10px] uppercase opacity-70">Deep Dive</span>
                </button>
              </div>
            </div>
            <ActionButton icon={LockKeyhole} className="w-full" onClick={onCreate} disabled={!nameReady}>
              Create Room
            </ActionButton>
          </motion.div>

          {/* Join Room */}
          <motion.form whileHover={{ y: -2 }} onSubmit={handleJoin} className="glass-panel rounded-xl p-4 sm:p-6 w-full min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-emerald">Join</p>
                <h2 className="mt-1 text-xl sm:text-2xl font-semibold text-white truncate">
                  {joinStep === "signal" ? "Choose Your Signal" : "Enter 6-Digit Code"}
                </h2>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-emerald/14 text-emerald">
                <DoorOpen size={22} aria-hidden="true" />
              </div>
            </div>

            {joinStep === "code" ? (
              <>
                <input
                  className="focus-ring touch-target mb-3 w-full max-w-full rounded-lg border border-white/12 bg-black/25 px-3 py-2 text-center text-xl sm:text-2xl font-semibold tracking-[0.2em] sm:tracking-[0.28em] text-white placeholder:text-white/22"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="000000"
                  aria-label="Room code"
                />
                <ActionButton icon={Users} className="w-full text-xs sm:text-sm" disabled={!canProceedToSignal}>
                  Next — Choose Your Signal
                </ActionButton>
                {!nameReady && roomReady && <p className="mt-2 text-center text-xs text-white/40">Enter your name first</p>}
              </>
            ) : (
              // Step 2: Joiner picks their private relationship
              <>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3 w-full min-w-0">
                  <RelationshipPicker value={relationshipType} onChange={setRelationshipType} />
                  <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-emerald/40 bg-emerald/10 px-2.5 py-2 shadow-[0_0_18px_rgba(16,185,129,0.12)] min-w-0">
                    <Shield size={14} className="shrink-0 text-emerald" aria-hidden="true" />
                    <p className="text-xs leading-4 min-w-0 break-words">
                      <span className="font-semibold text-emerald inline-block mr-1">Only visible to you</span>
                      <span className="text-white/55">— the other player has already chosen theirs privately</span>
                    </p>
                  </div>
                </motion.div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJoinStep("code")}
                    className="focus-ring flex h-12 items-center justify-center rounded-lg border border-white/14 bg-white/6 px-3 text-xs sm:text-sm text-white/60 hover:text-white transition"
                  >
                    ← Back
                  </button>
                  <ActionButton icon={Users} className="w-full text-xs sm:text-sm">
                    Join Room
                  </ActionButton>
                </div>
              </>
            )}
          </motion.form>
        </div>
      </div>

      {screen === "waiting" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel mx-auto flex w-full max-w-md flex-col items-center rounded-xl p-5 sm:p-6 text-center"
        >
          <div className="relative mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border border-cyan/30">
            <span className="absolute h-full w-full animate-ping rounded-full border border-cyan/40" />
            <Eye className="text-cyan" size={28} aria-hidden="true" />
          </div>
          <p className="text-xs sm:text-sm uppercase tracking-[0.24em] text-white/45">Room {roomCode}</p>
          <h2 className="mt-1 text-lg sm:text-xl font-semibold">Waiting for Player 2</h2>
          <p className="mt-1 text-xs sm:text-sm text-white/55">{playersCount}/2 linked</p>
        </motion.div>
      )}

      {error ? <p className="mx-auto max-w-xl text-center text-xs sm:text-sm text-danger px-2">{error}</p> : null}
    </PageShell>
  );
}

function RelationshipPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const selected = relationships.find((r) => r.type === value) ?? relationships[0];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  function choose(next) { onChange(next); setIsOpen(false); }

  return (
    <div ref={ref} className="rounded-lg border border-emerald/25 bg-black/25 overflow-hidden w-full min-w-0">
      {/* Trigger row */}
      <button
        type="button"
        className="focus-ring flex w-full items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-white transition hover:bg-white/5"
        style={{ minHeight: 48 }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((c) => !c)}
      >
        <span className="min-w-0 overflow-hidden">
          <span className="block text-xs sm:text-sm font-semibold truncate">{selected.label}</span>
          <span className="mt-0.5 block truncate text-[11px] sm:text-xs text-white/45">{selected.description}</span>
        </span>
        <ChevronDown aria-hidden="true" size={18} className={`shrink-0 text-emerald transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Inline options — no absolute positioning */}
      {isOpen && (
        <div role="listbox" className="border-t border-white/10 bg-[#101017] p-1.5 max-h-60 overflow-y-auto custom-scrollbar">
          {relationships.map((r) => {
            const sel = r.type === value;
            return (
              <button
                key={r.type}
                type="button"
                role="option"
                aria-selected={sel}
                className={`focus-ring flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${sel ? "bg-emerald/14 text-white" : "text-white/65 hover:bg-white/6 hover:text-white"}`}
                onClick={() => choose(r.type)}
              >
                <CheckCircle2 aria-hidden="true" size={16} className={`mt-0.5 shrink-0 ${sel ? "text-emerald" : "text-white/18"}`} />
                <span className="min-w-0">
                  <span className="block text-xs sm:text-sm font-semibold">{r.label}</span>
                  <span className="mt-0.5 block text-[11px] sm:text-xs leading-4 text-white/40">{r.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Play Screen ────────────────────────────────────────────────────────────── */
function PlayScreen({ roomCode, roundState, isSubmitting, platformAnswered, error,
  onSubmitPrompts, onSubmitAnswers, onSubmitGuess, onSubmitExplanation,
  onSubmitPlatformAnswer, onHonestyJudgment, onNextRound, onTimerExpiry, onDoodleSaved, onExit }) {
  const { phase, myRole, targetPlayer, observerPlayer, prompts, targetAnswers, targetAnswerImages,
    lieIndex, observerGuessedLieIndex, targetExplanation,
    isPlatformRound, platformQuestion, platformAnswers, platformAnswerImages } = roundState;

  const isTarget   = myRole === "target";
  const isObserver = myRole === "observer";

  return (
    <div className="min-h-screen">
      <ProgressHeader roomCode={roomCode} roundNumber={roundState.roundNumber} maxRounds={roundState.maxRounds}
        isPlatformRound={isPlatformRound} onExit={onExit} />
      <PageShell className="min-h-[calc(100vh-88px)] gap-4 py-4">
        {/* Status bar */}
        {!isPlatformRound && (
          <section className="glass-panel mx-auto grid w-full max-w-6xl gap-3 rounded-xl p-4 sm:grid-cols-3">
            <StatusChip label="You are"    value={isObserver ? "Asker / Observer" : "Target"} accent="cyan" />
            <StatusChip label="Target"     value={targetPlayer.name} accent="emerald" />
            <StatusChip label="Your Signal" value={roundState.myRelationship?.label ?? "—"} accent="violet" />
          </section>
        )}

        {/* ── Platform rounds (4, 7, 9) ── */}
        {isPlatformRound && (phase === "PLATFORM_WAIT" || phase === "PLATFORM_REVEAL") && (
          <PlatformRoundPanel
            roundState={roundState}
            platformQuestion={platformQuestion}
            platformAnswers={platformAnswers}
            platformAnswerImages={platformAnswerImages}
            phase={phase}
            isSubmitting={isSubmitting}
            platformAnswered={platformAnswered}
            onSubmit={onSubmitPlatformAnswer}
            onNextRound={onNextRound}
            onTimerExpiry={() => onTimerExpiry("PLATFORM_WAIT")}
            onHonestyJudgment={onHonestyJudgment}
          />
        )}

        {/* ── Regular round phases ── */}
        {!isPlatformRound && (
          <>
            {phase === "QUESTION_SELECTION" && isObserver && (
              <QuestionComposer
                roundState={roundState}
                isSubmitting={isSubmitting}
                onSubmit={onSubmitPrompts}
                onTimerExpiry={() => onTimerExpiry("QUESTION_SELECTION")}
              />
            )}

            {phase === "QUESTION_SELECTION" && isTarget && (
              <WaitingPanel title={`${observerPlayer.name} is writing 3 questions`} body="You will answer all 3 questions — two truths and one lie." onDoodleSaved={onDoodleSaved} />
            )}

            {phase === "TARGET_ANSWER" && isTarget && (
              <TargetAnswerPanel
                prompts={prompts}
                isSubmitting={isSubmitting}
                onSubmit={onSubmitAnswers}
                onTimerExpiry={() => onTimerExpiry("TARGET_ANSWER")}
              />
            )}

            {phase === "TARGET_ANSWER" && isObserver && (
              <WaitingPanel title={`${targetPlayer.name} is answering your questions`} body="They'll write 2 truths and 1 lie. Get ready to read them." onDoodleSaved={onDoodleSaved} />
            )}

            {phase === "OBSERVER_GUESS" && isObserver && (
              <ObserverGuessPanel
                prompts={prompts}
                targetAnswers={targetAnswers}
                isSubmitting={isSubmitting}
                onSubmit={onSubmitGuess}
              />
            )}

            {phase === "OBSERVER_GUESS" && isTarget && (
              <WaitingPanel title={`${observerPlayer.name} is reading your answers`} body="They're trying to detect your lie. Stay calm." onDoodleSaved={onDoodleSaved} />
            )}

            {phase === "TARGET_EXPLANATION" && isTarget && (
              <ExplanationPanel
                prompts={prompts}
                targetAnswers={targetAnswers}
                lieIndex={lieIndex}
                isSubmitting={isSubmitting}
                onSubmit={onSubmitExplanation}
              />
            )}

            {phase === "TARGET_EXPLANATION" && isObserver && (
              <WaitingPanel
                title={`You got it! ${targetPlayer.name} is explaining`}
                body="They're typing out the real answer and context behind their lie."
                onDoodleSaved={onDoodleSaved}
              />
            )}

            {phase === "REVEAL" && (
              <RevealPanel
                prompts={prompts}
                targetAnswers={targetAnswers}
                targetAnswerImages={targetAnswerImages}
                lieIndex={lieIndex}
                observerGuessedLieIndex={observerGuessedLieIndex}
                targetExplanation={targetExplanation}
                targetPlayer={targetPlayer}
                observerPlayer={observerPlayer}
                isTarget={isTarget}
                isObserver={isObserver}
                isSubmitting={isSubmitting}
                onNextRound={onNextRound}
                onHonestyJudgment={onHonestyJudgment}
                roundState={roundState}
              />
            )}
          </>
        )}

        {error ? <p className="text-center text-sm text-danger">{error}</p> : null}
      </PageShell>
    </div>
  );
}

function StatusChip({ label, value, accent }) {
  const color = accent === "emerald" ? "text-emerald" : accent === "violet" ? "text-violet-200" : "text-cyan";
  return (
    <div className="rounded-lg border border-white/10 bg-black/18 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-white/38">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

/* ─── Observer: Pick 3 questions ─────────────────────────────────────────────── */
function QuestionComposer({ roundState, isSubmitting, onSubmit, onTimerExpiry }) {
  const [prompts, setPrompts] = useState(["", "", ""]);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const suggestions = roundState.questionSuggestions ?? [];
  const cb = useCallback(() => onTimerExpiry?.(), [onTimerExpiry]);
  const { remaining, pct, urgent } = useCountdown(180, cb);

  function useSuggestion(s) {
    setPrompts([...s.prompts]);
    setActiveSuggestion(s.id);
  }

  function updatePrompt(i, val) {
    setPrompts((prev) => { const next = [...prev]; next[i] = val; return next; });
    setActiveSuggestion(null);
  }

  const canSubmit = prompts.every((p) => p.trim().length > 4) && !isSubmitting;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1fr_1.1fr]">
      {/* Suggestions */}
      <section className="glass-panel rounded-xl p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-cyan" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">AI Suggestion Sets</p>
            <h2 className="text-xl font-semibold">Pick a set to start with</h2>
          </div>
        </div>
        <p className="mb-4 rounded-lg border border-white/10 bg-black/18 p-3 text-sm leading-6 text-white/58">
          Based on your private signal: <span className="text-white">{roundState.myRelationship?.label}</span> — {roundState.myRelationship?.description}
        </p>
        <div className="grid gap-3">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => useSuggestion(s)}
              className={`focus-ring rounded-lg border p-4 text-left transition ${activeSuggestion === s.id ? "border-cyan/60 bg-cyan/10" : "border-white/10 bg-white/[0.045] hover:border-cyan/40 hover:bg-cyan/8"}`}
            >
              <p className="mb-2 text-xs font-semibold uppercase text-cyan">{s.category}</p>
              {s.prompts.map((p, pi) => (
                <p key={pi} className="mb-1 text-sm text-white/70 leading-5"><span className="mr-2 text-white/35">{pi + 1}.</span>{p}</p>
              ))}
              <p className="mt-2 text-xs text-white/35">Tap to load into editor →</p>
            </button>
          ))}
        </div>
      </section>

      {/* Editor */}
      <section className="glass-panel rounded-xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-emerald" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald">Your 3 Questions</p>
              <h2 className="text-xl font-semibold">For {roundState.targetPlayer.name}</h2>
            </div>
          </div>
          <TimerRing remaining={remaining} pct={pct} urgent={urgent} />
        </div>
        <p className="mb-4 rounded-lg border border-white/10 bg-black/14 p-3 text-sm text-white/55">
          Your target will answer all 3 questions — <span className="text-white">2 truths and 1 lie</span>. You will then guess which one is the lie.
        </p>
        <div className="grid gap-3">
          {prompts.map((p, i) => (
            <div key={i}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Question {i + 1}</label>
              <textarea
                className="focus-ring w-full resize-none rounded-lg border border-white/12 bg-black/25 p-4 text-sm text-white placeholder:text-white/30 min-h-[80px]"
                value={p}
                onChange={(e) => updatePrompt(i, e.target.value)}
                placeholder={`Type question ${i + 1} for ${roundState.targetPlayer.name}...`}
              />
            </div>
          ))}
          <ActionButton icon={Send} onClick={() => onSubmit(prompts)} disabled={!canSubmit} className="w-full mt-2">
            {isSubmitting ? "Sending..." : "Send Questions to Target"}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

/* ─── Target: Answer 3 questions + pick the lie ──────────────────────────────── */
function TargetAnswerPanel({ prompts, isSubmitting, onSubmit, onTimerExpiry }) {
  const [answers, setAnswers] = useState(["", "", ""]);
  const [images, setImages] = useState([null, null, null]);
  const [lieIndex, setLieIndex] = useState(null);
  const cb = useCallback(() => onTimerExpiry?.(), [onTimerExpiry]);
  const { remaining, pct, urgent } = useCountdown(90, cb);

  function updateAnswer(i, val) {
    setAnswers((prev) => { const next = [...prev]; next[i] = val; return next; });
  }

  async function handleImagePick(i, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setImages((prev) => { const next = [...prev]; next[i] = dataUrl; return next; });
    } catch (err) {
      console.error(err);
    }
  }

  function removeImage(i) {
    setImages((prev) => { const next = [...prev]; next[i] = null; return next; });
  }

  const canSubmit = answers.every((a) => a.trim().length > 1) && lieIndex !== null && !isSubmitting;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <section className="glass-panel rounded-xl p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald">Your Turn</p>
            <h2 className="mt-2 text-2xl font-semibold">Answer all 3 questions</h2>
            <p className="mt-2 text-sm text-white/55">
              Write honest answers — but <span className="text-white font-semibold">one of them must be a lie</span>. Tap which one you are lying on.
            </p>
          </div>
          <TimerRing remaining={remaining} pct={pct} urgent={urgent} />
        </div>

        <div className="grid gap-5">
          {prompts.map((prompt, i) => (
            <div
              key={i}
              className={`rounded-xl border p-5 transition cursor-pointer ${lieIndex === i ? "border-danger/60 bg-danger/8 shadow-[0_0_24px_rgba(244,63,94,0.12)]" : "border-white/10 bg-black/18"}`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40 mb-1">Question {i + 1}</p>
                  <p className="text-sm font-medium text-white/85 leading-6">{prompt}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLieIndex(lieIndex === i ? null : i)}
                  className={`shrink-0 mt-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${lieIndex === i ? "border-danger/60 bg-danger/20 text-danger" : "border-white/14 bg-white/6 text-white/50 hover:border-white/28 hover:text-white"}`}
                >
                  {lieIndex === i ? "🤥 Lie" : "Mark as Lie"}
                </button>
              </div>
              <div className="relative">
                <textarea
                  className="focus-ring w-full resize-none rounded-lg border border-white/10 bg-black/30 p-3 pr-12 text-sm text-white placeholder:text-white/28 min-h-[70px]"
                  value={answers[i]}
                  onChange={(e) => updateAnswer(i, e.target.value)}
                  placeholder={lieIndex === i ? "Type your lie..." : "Type your true answer..."}
                />
                <label className="absolute right-3 top-3 cursor-pointer text-white/30 hover:text-white transition">
                  <ImageIcon size={20} />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(i, e)} />
                </label>
              </div>
              {images[i] && (
                <div className="mt-2 relative inline-block">
                  <img src={images[i]} alt="Attached" className="h-20 w-20 rounded-md object-cover border border-white/10" />
                  <button onClick={() => removeImage(i)} className="absolute -top-2 -right-2 rounded-full bg-danger text-white p-1 shadow-md hover:bg-danger/80">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {lieIndex === null && (
            <p className="text-center text-xs text-amber-400/80">← Tap "Mark as Lie" on the one you are lying about</p>
          )}

          <ActionButton
            icon={CheckCircle2}
            onClick={() => onSubmit(answers, lieIndex, images)}
            disabled={!canSubmit}
            className="w-full"
          >
            {isSubmitting ? "Locking in..." : "Lock In Answers"}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

/* ─── Observer: Guess the lie ────────────────────────────────────────────────── */
function ObserverGuessPanel({ prompts, targetAnswers, isSubmitting, onSubmit }) {
  const [guess, setGuess] = useState(null);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <section className="glass-panel rounded-xl p-5 sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Your Read</p>
          <h2 className="mt-2 text-2xl font-semibold">Which one is the lie?</h2>
          <p className="mt-2 text-sm text-white/55">Read all 3 answers carefully. Only one is a lie — tap to guess it.</p>
        </div>

        <div className="grid gap-4">
          {prompts.map((prompt, i) => (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setGuess(guess === i ? null : i)}
              className={`w-full rounded-xl border p-5 text-left transition ${guess === i ? "border-cyan/70 bg-cyan/10 shadow-glow" : "border-white/10 bg-black/18 hover:border-white/22 hover:bg-white/[0.04]"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40 mb-2">Question {i + 1}</p>
              <p className="text-sm text-white/60 mb-3 leading-5">{prompt}</p>
              <p className="text-base font-semibold text-white leading-6">{targetAnswers[i]}</p>
              {guess === i && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs font-semibold text-cyan">
                  ← You think this is the lie
                </motion.p>
              )}
            </motion.button>
          ))}

          <ActionButton
            icon={Eye}
            onClick={() => onSubmit(guess)}
            disabled={guess === null || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Reading..." : "Submit My Read"}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

/* ─── Target: Explain the lie (only when observer was right) ─────────────────── */
function ExplanationPanel({ prompts, targetAnswers, lieIndex, isSubmitting, onSubmit }) {
  const [explanation, setExplanation] = useState("");
  const canSubmit = explanation.trim().length > 3 && !isSubmitting;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="glass-panel rounded-xl p-5 sm:p-7">
        <div className="mb-6 flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/14 text-amber-400">
            <ShieldAlert size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Caught!</p>
            <h2 className="mt-1 text-2xl font-semibold">They got it right</h2>
            <p className="mt-2 text-sm text-white/55">Your lie was spotted. Now you owe them the real answer and the honest context behind it.</p>
          </div>
        </div>

        <div className="rounded-xl border border-danger/30 bg-danger/8 p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-danger/80 mb-2">Your Lie (Q{lieIndex + 1})</p>
          <p className="text-sm text-white/60 mb-2">{prompts[lieIndex]}</p>
          <p className="text-base font-semibold text-white">{targetAnswers[lieIndex]}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/50 mb-2">The real answer + your reasoning</label>
          <textarea
            className="focus-ring w-full resize-none rounded-lg border border-white/12 bg-black/25 p-4 text-sm text-white placeholder:text-white/30 min-h-[100px]"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Be honest about what's really true and why you chose to lie here..."
          />
          <ActionButton icon={Send} onClick={() => onSubmit(explanation)} disabled={!canSubmit} className="w-full mt-3">
            {isSubmitting ? "Sending..." : "Send My Explanation"}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

/* ─── Reveal ─────────────────────────────────────────────────────────────────── */
function RevealPanel({ prompts, targetAnswers, targetAnswerImages, lieIndex, observerGuessedLieIndex, targetExplanation,
  targetPlayer, observerPlayer, isTarget, isObserver, isSubmitting,
  onNextRound, onHonestyJudgment, roundState }) {
  const isCorrect = observerGuessedLieIndex === lieIndex;
  const canContinue = isObserver;
  const judgment = roundState?.honestyJudgment;
  const hasJudged = judgment?.verdict !== null && judgment?.verdict !== undefined;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl p-5 sm:p-7"
      >
        {/* Result Badge */}
        <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${isCorrect ? "border-cyan/40 bg-cyan/8" : "border-danger/40 bg-danger/8"}`}>
          {isCorrect ? (
            <CheckCircle2 size={28} className="shrink-0 text-cyan" aria-hidden="true" />
          ) : (
            <XCircle size={28} className="shrink-0 text-danger" aria-hidden="true" />
          )}
          <div>
            <p className={`text-lg font-semibold ${isCorrect ? "text-cyan" : "text-danger"}`}>
              {isCorrect ? `${observerPlayer.name} read it correctly!` : `${observerPlayer.name} missed it!`}
            </p>
            <p className="text-sm text-white/55 mt-0.5">
              {isCorrect ? "They spotted the lie on question " : "The lie was actually question "}{lieIndex + 1}.
            </p>
          </div>
        </div>

        {/* The 3 Q&A cards */}
        <div className="grid gap-3 mb-6">
          {prompts.map((prompt, i) => {
            const isLie = i === lieIndex;
            const wasGuessed = i === observerGuessedLieIndex;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-xl border p-4 ${isLie ? "border-danger/40 bg-danger/6" : "border-white/10 bg-black/14"}`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40">Q{i + 1}</p>
                  {isLie && <span className="rounded-full bg-danger/22 px-2 py-0.5 text-xs font-semibold text-danger">LIE</span>}
                  {wasGuessed && !isLie && <span className="rounded-full bg-amber-400/18 px-2 py-0.5 text-xs font-semibold text-amber-400">Guessed Here</span>}
                  {wasGuessed && isLie && <span className="rounded-full bg-cyan/18 px-2 py-0.5 text-xs font-semibold text-cyan">Correctly Caught</span>}
                </div>
                <p className="text-sm text-white/55 mb-1 leading-5">{prompt}</p>
                <p className="text-base font-semibold text-white">{targetAnswers[i]}</p>
                {targetAnswerImages?.[i] && (
                  <img src={targetAnswerImages[i]} alt="Upload" className="mt-3 h-32 w-full max-w-[200px] object-cover rounded-md border border-white/10" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Explanation (only if observer was right) */}
        {isCorrect && targetExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/6 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-400 mb-2">
              {targetPlayer.name}'s Real Answer
            </p>
            <p className="text-sm leading-6 text-white/85">{targetExplanation}</p>
          </motion.div>
        )}

        {/* Honesty judgment — only the observer rates the target */}
        {isObserver && (
          <div className="mb-6 rounded-xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45 mb-3">
              Was {targetPlayer.name} being honest overall?
            </p>
            {hasJudged ? (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                judgment.verdict === "honest" ? "bg-emerald/14 text-emerald" : "bg-amber-400/14 text-amber-400"
              }`}>
                {judgment.verdict === "honest" ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                You rated: {judgment.verdict === "honest" ? "Seemed Honest" : "Kinda Sus"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => onHonestyJudgment("honest")}
                  className="flex items-center justify-center gap-2 rounded-lg border border-emerald/40 bg-emerald/10 px-4 py-3 text-sm font-semibold text-emerald transition hover:bg-emerald/20">
                  <ThumbsUp size={16} /> Seemed Honest
                </button>
                <button type="button" onClick={() => onHonestyJudgment("sus")}
                  className="flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/20">
                  <ThumbsDown size={16} /> Kinda Sus
                </button>
              </div>
            )}
          </div>
        )}

        {/* Continue */}
        {canContinue ? (
          <ActionButton icon={RotateCcw} onClick={onNextRound} disabled={isSubmitting} className="w-full">
            {roundState.roundNumber >= roundState.maxRounds ? "See Final Results" : "Next Round"}
          </ActionButton>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/6 p-4 text-center text-sm text-white/56">
            Waiting for {observerPlayer.name} to continue...
          </p>
        )}
      </motion.section>
    </div>
  );
}

/* ─── Waiting ────────────────────────────────────────────────────────────────── */
function WaitingPanel({ title, body, onDoodleSaved }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const hasDrawn = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#06B6D4"; // cyan
    ctx.lineWidth = 3;

    return () => {
      if (hasDrawn.current && onDoodleSaved) {
        const image = canvas.toDataURL("image/png");
        onDoodleSaved(image, title);
      }
    };
  }, [onDoodleSaved, title]);

  function startDrawing(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    hasDrawn.current = true;
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault(); // prevent scrolling on touch
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  return (
    <div className="glass-panel mx-auto flex min-h-[420px] w-full max-w-2xl flex-col items-center justify-center rounded-xl p-6 text-center">
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-cyan/20 bg-cyan/8">
        <span className="absolute h-full w-full animate-ping rounded-full border border-cyan/30" />
        <Sparkles size={34} className="text-cyan" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-white/56">{body}</p>

      {/* Doodle Pad */}
      <div className="mt-10 w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/40 mb-3 flex items-center justify-center gap-2">
          <Pencil size={14} /> Draw something while waiting!
        </p>
        <canvas
          ref={canvasRef}
          width={300}
          height={150}
          className="mx-auto rounded-xl border border-white/10 bg-black/20 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
        <button
          onClick={() => {
            const canvas = canvasRef.current;
            if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
            hasDrawn.current = false;
          }}
          className="mt-3 text-xs text-white/30 hover:text-white/60 transition"
        >
          Clear Pad
        </button>
      </div>
    </div>
  );
}

/* ─── Results ─────────────────────────────────────────────────────────────────── */
function ResultsScreen({ finalMetrics, roundHistory, resultsMeta, onPlayAgain }) {
  const scorecardRef = useRef(null);
  const won       = finalMetrics?.roundsWon    ?? 0;
  const lost      = finalMetrics?.roundsLost   ?? 0;
  const susCount  = finalMetrics?.susCount     ?? 0;
  const honestCnt = finalMetrics?.honestCount  ?? 0;
  const total     = won + lost || 1;
  const pct       = Math.round((won / total) * 100);

  let connectionVerdict = "";
  if (pct >= 85) connectionVerdict = "Soulmates / Telepathic";
  else if (pct >= 60) connectionVerdict = "Solid Connection";
  else if (pct >= 40) connectionVerdict = "Acquaintances masquerading as friends";
  else connectionVerdict = "Total Strangers";

  const honestyVerdict = susCount > honestCnt
    ? `${resultsMeta?.players?.host?.name ?? "Someone"} seems sus 👀`
    : honestCnt > susCount
      ? "Y'all were surprisingly honest 😇"
      : "Even split — who knows what to believe 🤷";

  async function downloadScorecard() {
    if (!scorecardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(scorecardRef.current, { backgroundColor: "#0a0a12", scale: 2 });
      const link = document.createElement("a");
      link.download = "veritas-scorecard.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Screenshot failed:", e);
    }
  }

  async function shareScorecard() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Veritas — Game Over!",
          text: `We played Veritas! Lie detection rate: ${pct}%. ${honestyVerdict}`,
          url: window.location.origin
        });
      } catch { /* user cancelled */ }
    } else {
      downloadScorecard();
    }
  }

  return (
    <PageShell className="gap-6 py-8">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Score Card */}
        <section className="glass-panel rounded-xl p-6 text-center sm:p-8">
          {/* Capturable scorecard area */}
          <div ref={scorecardRef} className="rounded-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan">Game Over</p>
            <div className="relative mx-auto mt-7 flex h-48 w-48 items-center justify-center rounded-full border border-cyan/28 bg-cyan/8 shadow-glow">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
                <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
                <motion.circle cx="100" cy="100" r="84" fill="none" stroke="#06B6D4" strokeLinecap="round" strokeWidth="14"
                  initial={{ pathLength: 0 }} animate={{ pathLength: pct / 100 }} transition={{ duration: 1, ease: "easeOut" }} />
              </svg>
              <div>
                <div className="text-5xl font-semibold">{pct}%</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">Read rate</div>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">How well do you know each other?</p>
              <h1 className="text-xl sm:text-2xl font-semibold text-cyan">
                {connectionVerdict}
              </h1>
            </div>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/55">
              {resultsMeta?.players?.host?.name} &amp; {resultsMeta?.players?.guest?.name}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-cyan/28 bg-cyan/8 p-4">
                <p className="text-3xl font-semibold text-cyan">{won}</p>
                <p className="mt-1 text-xs text-white/50 uppercase tracking-[0.14em]">Lies caught</p>
              </div>
              <div className="rounded-xl border border-danger/28 bg-danger/6 p-4">
                <p className="text-3xl font-semibold text-danger">{lost}</p>
                <p className="mt-1 text-xs text-white/50 uppercase tracking-[0.14em]">Lies missed</p>
              </div>
            </div>

            {/* Honesty meter */}
            {(susCount + honestCnt) > 0 && (
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Honesty Meter</p>
                <div className="flex items-center gap-3 text-sm">
                  <ThumbsUp size={16} className="text-emerald shrink-0" />
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((honestCnt / (honestCnt + susCount)) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <ThumbsDown size={16} className="text-amber-400 shrink-0" />
                </div>
                <p className="mt-2.5 text-xs text-white/50">{honestyVerdict}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={shareScorecard}
              className="flex items-center justify-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20">
              <Share2 size={16} /> Share
            </button>
            <button type="button" onClick={downloadScorecard}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/14">
              <Download size={16} /> Save
            </button>
          </div>
          <ActionButton icon={RotateCcw} variant="secondary" onClick={onPlayAgain} className="mt-3 w-full">
            Play Again
          </ActionButton>
        </section>

        {/* Round History */}
        <section className="glass-panel rounded-xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-emerald" size={22} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Round Recap</h2>
          </div>
          <div className="grid max-h-[600px] gap-3 overflow-auto pr-1">
            {roundHistory.map((round) => (
              <details key={round.roundNumber} className="rounded-xl border border-white/10 bg-black/18 p-4">
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">
                    {round.isPlatformRound
                      ? `🌎 Round ${round.roundNumber}: Platform Question`
                      : `Round ${round.roundNumber}: ${round.observerPlayer?.name} asked ${round.targetPlayer?.name}`}
                  </span>
                  {!round.isPlatformRound && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${round.isCorrect ? "bg-cyan/18 text-cyan" : "bg-danger/18 text-danger"}`}>
                      {round.isCorrect ? "Caught" : "Missed"}
                    </span>
                  )}
                </summary>
                <div className="mt-3 grid gap-2">
                  {round.isPlatformRound ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet/70 mb-1">Platform Q</p>
                      <p className="text-sm text-white/75 mb-2">{round.platformQuestion}</p>
                      {round.platformAnswers?.host && (
                        <div className="rounded-lg bg-white/[0.04] p-3 text-sm">
                          <p className="text-xs text-white/35 mb-1">Host</p>
                          <p className="text-white">{round.platformAnswers.host}</p>
                          {round.platformAnswerImages?.host && (
                            <img src={round.platformAnswerImages.host} alt="Upload" className="mt-2 h-20 w-auto rounded-md border border-white/10" />
                          )}
                        </div>
                      )}
                      {round.platformAnswers?.guest && (
                        <div className="rounded-lg bg-white/[0.04] p-3 text-sm">
                          <p className="text-xs text-white/35 mb-1">Guest</p>
                          <p className="text-white">{round.platformAnswers.guest}</p>
                          {round.platformAnswerImages?.guest && (
                            <img src={round.platformAnswerImages.guest} alt="Upload" className="mt-2 h-20 w-auto rounded-md border border-white/10" />
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {(round.prompts ?? []).map((p, i) => (
                        <div key={i} className={`rounded-lg p-3 text-sm ${i === round.lieIndex ? "border border-danger/30 bg-danger/6" : "bg-white/[0.04]"}`}>
                          <p className="text-xs text-white/40 mb-1">Q{i + 1} — {i === round.lieIndex ? "🤥 Lie" : "✓ Truth"}</p>
                          <p className="text-white/60 mb-1">{p}</p>
                          <p className="font-semibold text-white">{round.targetAnswers?.[i]}</p>
                          {round.targetAnswerImages?.[i] && (
                            <img src={round.targetAnswerImages[i]} alt="Upload" className="mt-2 h-20 w-auto rounded-md border border-white/10" />
                          )}
                        </div>
                      ))}
                      {round.targetExplanation && (
                        <div className="rounded-lg border border-amber-400/25 bg-amber-400/6 p-3 text-sm">
                          <p className="text-xs text-amber-400 mb-1">Real Answer</p>
                          <p className="text-white/80">{round.targetExplanation}</p>
                        </div>
                      )}
                      {round.honestyJudgment?.verdict && (
                        <div className={`rounded-lg p-3 text-xs font-semibold ${
                          round.honestyJudgment.verdict === "honest" ? "bg-emerald/10 text-emerald" : "bg-amber-400/10 text-amber-400"
                        }`}>
                          {round.honestyJudgment.judgedBy} rated: {round.honestyJudgment.verdict === "honest" ? "👍 Seemed Honest" : "👎 Kinda Sus"}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

/* ─── Chat Widget ────────────────────────────────────────────────────────────── */
function ChatWidget({ open, onOpen, onClose, messages, unread, onSend, myName }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-5 z-50 flex flex-col items-end gap-3 max-w-full">
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          className="glass-panel flex w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 flex-col rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          style={{ maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-cyan" aria-hidden="true" />
              <p className="text-sm font-semibold">Chat</p>
            </div>
            <button type="button" onClick={onClose} className="focus-ring rounded-lg p-1 text-white/50 hover:text-white transition">
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2" style={{ minHeight: "180px", maxHeight: "280px" }}>
            {messages.length === 0 && (
              <p className="text-center text-xs text-white/35 mt-8">No messages yet. Say something!</p>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.senderName === myName;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {!isMe && <p className="mb-0.5 text-xs text-white/40">{msg.senderName}</p>}
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${isMe ? "bg-cyan text-jet font-medium" : "bg-white/10 text-white"}`}>
                    {msg.text}
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2 border-t border-white/10 px-3 py-2.5">
            <input
              className="focus-ring flex-1 rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 min-w-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan text-jet transition hover:bg-cyan/90 disabled:opacity-40"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </form>
        </motion.div>
      )}

      {/* FAB */}
      {!open && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onOpen}
          className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-cyan text-jet shadow-glow transition hover:bg-cyan/90"
          aria-label="Open chat"
        >
          <MessageCircle size={22} aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </motion.button>
      )}
    </div>
  );
}

/* ─── Admin ──────────────────────────────────────────────────────────────────── */
function AdminDashboard({ onExit }) {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("vt_admin_key") ?? "");
  const [authed, setAuthed]     = useState(false);
  const [sessions, setSessions] = useState([]);
  const [status, setStatus]     = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (adminKey) verifyAndLoad(adminKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyAndLoad(key) {
    setLoading(true);
    setLoginError("");
    try {
      const res  = await fetch(`${serverUrl}/api/admin/sessions`, { headers: { "x-admin-key": key } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Wrong key.");
      sessionStorage.setItem("vt_admin_key", key);
      setAdminKey(key);
      setSessions(data);
      setStatus(`${data.length} session${data.length !== 1 ? "s" : ""} loaded`);
      setAuthed(true);
    } catch (err) {
      sessionStorage.removeItem("vt_admin_key");
      setLoginError(err.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setStatus("Refreshing...");
    try {
      const res  = await fetch(`${serverUrl}/api/admin/sessions`, { headers: { "x-admin-key": adminKey } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setSessions(data);
      setStatus(`${data.length} session${data.length !== 1 ? "s" : ""} loaded`);
    } catch (err) { setStatus(err.message); }
  }

  function logout() {
    sessionStorage.removeItem("vt_admin_key");
    setAuthed(false);
    setSessions([]);
    setAdminKey("");
    setStatus("");
  }

  if (!authed) {
    return (
      <main className="min-h-screen text-white">
        <PageShell className="justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-sm"
          >
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet/40 bg-violet/14 shadow-[0_0_36px_rgba(109,40,217,0.22)]">
                <Shield size={28} className="text-violet" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet">Restricted</p>
              <h1 className="mt-2 text-3xl font-bold">Admin Access</h1>
              <p className="mt-2 text-sm text-white/45">Enter your admin key to view session logs</p>
            </div>
            <div className="glass-panel rounded-2xl p-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                Admin Key
              </label>
              <TextInput
                type="password"
                value={adminKey}
                onChange={(e) => { setAdminKey(e.target.value); setLoginError(""); }}
                placeholder="Enter admin key..."
                aria-label="Admin key"
                onKeyDown={(e) => e.key === "Enter" && adminKey && verifyAndLoad(adminKey)}
              />
              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-1.5 text-xs text-danger"
                >
                  <XCircle size={13} /> {loginError}
                </motion.p>
              )}
              <ActionButton
                icon={KeyRound}
                className="mt-4 w-full"
                disabled={!adminKey || loading}
                onClick={() => verifyAndLoad(adminKey)}
              >
                {loading ? "Verifying..." : "Enter Dashboard"}
              </ActionButton>
            </div>
            <button
              onClick={onExit}
              className="mt-4 w-full text-center text-sm text-white/35 hover:text-white/60 transition"
            >
              Back to game
            </button>
          </motion.div>
        </PageShell>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white">
      <PageShell className="gap-5 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">Veritas Session Logs</h1>
            {status && <p className="mt-1 text-xs text-white/40">{status}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={RotateCcw} variant="secondary" onClick={refresh}>Refresh</ActionButton>
            <ActionButton icon={Shield}    variant="secondary" onClick={logout}>Logout</ActionButton>
            <ActionButton icon={X}         variant="secondary" onClick={onExit}>Player App</ActionButton>
          </div>
        </div>
        <div className="grid gap-4">
          {sessions.length === 0
            ? <p className="py-12 text-center text-sm text-white/40">No sessions found.</p>
            : sessions.map((session) => <AdminSessionCard key={session._id} session={session} />)}
        </div>
      </PageShell>
    </main>
  );
}

function AdminSessionCard({ session }) {
  const host  = session.players?.host;
  const guest = session.players?.guest;
  const metrics = session.finalMetrics;

  return (
    <section className="glass-panel rounded-2xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-white/8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/38 mb-1">
            Room {session.roomCode} · {new Date(session.createdAt).toLocaleString()}
          </p>
          <h2 className="text-2xl font-bold">
            <span className="text-violet">{host?.name ?? "?"}</span>
            <span className="text-white/30 font-normal mx-2">vs</span>
            <span className="text-cyan">{guest?.name ?? "?"}</span>
          </h2>
          {/* Relationship tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="rounded-xl border border-violet/30 bg-violet/10 px-3 py-1.5 text-xs">
              <span className="text-white/40">{host?.name ?? "Host"} (host) sees this as: </span>
              <span className="text-violet font-semibold">{session.hostRelationship?.label ?? "—"}</span>
            </div>
            <div className="rounded-xl border border-cyan/25 bg-cyan/8 px-3 py-1.5 text-xs">
              <span className="text-white/40">{guest?.name ?? "Guest"} (guest) sees this as: </span>
              <span className="text-cyan font-semibold">{session.guestRelationship?.label ?? "—"}</span>
            </div>
          </div>
          {metrics && (
            <p className="mt-2 text-xs text-white/45">
              Observer caught the lie in <span className="text-cyan font-bold">{metrics.roundsWon}</span> round(s),
              missed in <span className="text-danger font-bold">{metrics.roundsLost}</span>
            </p>
          )}
        </div>
        <span className={`self-start shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider border ${
          session.status === "COMPLETED"   ? "border-cyan/30 bg-cyan/10 text-cyan" :
          session.status === "IN_PROGRESS" ? "border-amber-400/30 bg-amber-400/8 text-amber-400" :
          "border-white/10 bg-white/5 text-white/50"
        }`}>{session.status}</span>
      </div>

      {/* ── Body: Rounds left, Chat right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">

        {/* Rounds */}
        <div className="p-5 border-r border-white/6 flex flex-col gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">Round-by-round</p>

          {(!session.roundsData || session.roundsData.length === 0) && (
            <p className="text-sm text-white/30 italic">No rounds yet.</p>
          )}

          {session.roundsData?.map((round, index) => {
            if (round.isPlatformRound) {
              return (
                <div key={index} className="rounded-xl border border-violet/20 bg-violet/4 p-4">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.15em] text-violet/60 mb-1">🌎 Round {index + 1}</p>
                      <p className="text-sm font-semibold leading-snug text-white/80">Platform Round</p>
                    </div>
                  </div>
                  <div className="mb-4 rounded-lg bg-violet/10 border border-violet/20 p-3 text-sm text-violet">
                    {round.platformQuestion}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-white/[0.04] p-3 text-sm">
                      <p className="text-xs text-white/35 mb-1">Host ({host?.name})</p>
                      <p className="text-white">{round.platformAnswers?.host ?? "—"}</p>
                      {round.platformAnswerImages?.host && (
                        <img src={round.platformAnswerImages.host} alt="Upload" className="mt-2 h-20 w-auto rounded-md border border-white/10" />
                      )}
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-3 text-sm">
                      <p className="text-xs text-white/35 mb-1">Guest ({guest?.name})</p>
                      <p className="text-white">{round.platformAnswers?.guest ?? "—"}</p>
                      {round.platformAnswerImages?.guest && (
                        <img src={round.platformAnswerImages.guest} alt="Upload" className="mt-2 h-20 w-auto rounded-md border border-white/10" />
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const caught     = round.lieIndex === round.observerGuessedLieIndex;
            const guessedIdx = round.observerGuessedLieIndex;
            return (
              <div key={index} className={`rounded-xl border p-4 ${caught ? "border-cyan/20 bg-cyan/4" : "border-danger/20 bg-danger/4"}`}>

                {/* Narrative header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] text-white/35 mb-1">Round {index + 1}</p>
                    <p className="text-sm font-semibold leading-snug">
                      <span className="text-violet">{round.questionAuthorName}</span>
                      <span className="text-white/45"> chose the questions · </span>
                      <span className="text-amber-400">{round.targetName}</span>
                      <span className="text-white/45"> had to answer</span>
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${caught ? "bg-cyan/15 text-cyan" : "bg-danger/15 text-danger"}`}>
                    {caught ? "✓ Caught" : "✗ Missed"}
                  </span>
                </div>

                {/* Q&A blocks */}
                <div className="grid gap-2 mb-3">
                  {(round.prompts ?? []).map((prompt, i) => {
                    const isLie      = i === round.lieIndex;
                    const wasGuessed = guessedIdx === i;
                    return (
                      <div key={i} className={`rounded-lg p-3 ${isLie ? "border border-danger/35 bg-danger/8" : "bg-white/[0.04]"}`}>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-white/40">Q{i + 1}</span>
                          {isLie && (
                            <span className="rounded text-[10px] font-bold px-1.5 py-0.5 bg-danger/20 text-danger">← THE LIE</span>
                          )}
                          {wasGuessed && (
                            <span className="rounded text-[10px] font-bold px-1.5 py-0.5 bg-amber-400/15 text-amber-400">
                              {round.questionAuthorName} guessed this
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 leading-snug mb-2">{prompt}</p>
                        <p className="text-sm font-semibold text-white">
                          "{round.targetAnswers?.[i] ?? "—"}"
                        </p>
                        {round.targetAnswerImages?.[i] && (
                          <img src={round.targetAnswerImages[i]} alt="Upload" className="mt-2 h-20 w-auto rounded-md border border-white/10" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Verdict narrative */}
                <div className="rounded-lg bg-black/25 border border-white/6 p-3 text-xs text-white/55 leading-relaxed">
                  <p>
                    The lie was <span className="text-danger font-semibold">Q{(round.lieIndex ?? 0) + 1}</span>.{" "}
                    <span className="text-violet font-semibold">{round.questionAuthorName}</span>{" "}
                    {guessedIdx != null
                      ? <>guessed <span className="text-white font-semibold">Q{guessedIdx + 1}</span> — <span className={caught ? "text-cyan font-bold" : "text-danger font-bold"}>{caught ? "correct!" : "wrong."}</span></>
                      : <span className="text-white/30">did not submit a guess.</span>
                    }
                  </p>
                  {round.targetExplanation && (
                    <p className="mt-2 pt-2 border-t border-white/6">
                      <span className="text-amber-400 font-semibold">{round.targetName}</span> explained the lie:{" "}
                      <em className="text-white/70">"{round.targetExplanation}"</em>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat panel */}
        <div className="p-5 flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
            Chat — {session.chatMessages?.length ?? 0} messages
          </p>
          {(!session.chatMessages || session.chatMessages.length === 0) ? (
            <p className="text-sm text-white/25 italic">No messages exchanged.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {session.chatMessages.map((msg, i) => {
                const isHost = msg.senderName === host?.name;
                return (
                  <div key={i} className={`flex flex-col ${isHost ? "items-start" : "items-end"}`}>
                    <div className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-sm ${
                      isHost ? "bg-violet/15 rounded-tl-sm" : "bg-cyan/10 rounded-tr-sm"
                    }`}>
                      <p className={`text-[10px] font-bold mb-1 ${isHost ? "text-violet" : "text-cyan"}`}>
                        {msg.senderName}
                      </p>
                      <p className="text-white/85 leading-snug">{msg.text}</p>
                    </div>
                    <p className="text-[10px] text-white/22 mt-0.5 px-1">{new Date(msg.at).toLocaleTimeString()}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Doodles panel */}
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 mb-3">
              Doodles — {session.doodles?.length ?? 0} drawn
            </p>
            {(!session.doodles || session.doodles.length === 0) ? (
              <p className="text-sm text-white/25 italic">No doodles drawn.</p>
            ) : (
              <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {session.doodles.map((doodle, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-white/80">{doodle.playerName}</p>
                      <p className="text-[10px] text-white/40">{new Date(doodle.at).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">{doodle.phase}</p>
                    <img src={doodle.image} alt="Doodle" className="w-full rounded-lg bg-black/40 border border-white/5" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

export default App;

/* ─── Timer Ring ─────────────────────────────────────────────────────────────────── */
function TimerRing({ remaining, pct, urgent }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  // offset = 0 means full circle (start); offset = circ means empty (done)
  const offset = circ * (1 - pct);
  const mins = Math.floor(remaining / 60);
  const secs = String(remaining % 60).padStart(2, "0");
  const label = `${mins}:${secs}`;

  return (
    <div className={`relative flex shrink-0 h-16 w-16 items-center justify-center ${urgent ? "animate-pulse" : ""}`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
        {/* Track */}
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
        {/* Progress arc — drains clockwise */}
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={urgent ? "#f43f5e" : "#06B6D4"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="text-center">
        <Timer size={11} className={`mx-auto mb-0.5 ${urgent ? "text-danger" : "text-white/40"}`} aria-hidden="true" />
        <span className={`block text-[11px] font-semibold tabular-nums leading-none ${urgent ? "text-danger" : "text-white/70"}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

/* ─── Platform Round Panel ──────────────────────────────────────────────────────── */
function PlatformRoundPanel({ roundState, platformQuestion, platformAnswers, platformAnswerImages, phase,
  isSubmitting, platformAnswered, onSubmit, onNextRound, onTimerExpiry, onHonestyJudgment }) {
  const [myAnswer, setMyAnswer] = useState("");
  const [myImage, setMyImage] = useState(null);
  const mySlot = roundState?.mySlot;
  const myExistingAnswer = platformAnswers?.[mySlot];
  const hasMyAnswer = myExistingAnswer !== null && myExistingAnswer !== undefined;
  const partnerSlot = mySlot === "host" ? "guest" : "host";
  const partnerName = roundState?.players?.[partnerSlot]?.name ?? "Partner";
  const myName = roundState?.players?.[mySlot]?.name ?? "You";
  const cb = useCallback(() => onTimerExpiry?.(), [onTimerExpiry]);
  const { remaining, pct, urgent } = useCountdown(phase === "PLATFORM_WAIT" ? 90 : 9999, cb);
  const judgment = roundState?.honestyJudgment;
  const hasJudged = judgment?.verdict !== null && judgment?.verdict !== undefined;

  function submit() {
    if (!myAnswer.trim() || isSubmitting) return;
    onSubmit(myAnswer.trim(), myImage);
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setMyImage(dataUrl);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Header badge */}
      <div className="mb-5 flex items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet/20 border border-violet/40">
          <Sparkles size={22} className="text-violet" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet">
            🌎 Platform Round {roundState.roundNumber}
          </p>
          <p className="text-sm text-white/50">Both of you answer the same question</p>
        </div>
      </div>

      <section className="glass-panel rounded-xl p-5 sm:p-7">
        {/* The question */}
        <div className="mb-6 rounded-xl border border-violet/30 bg-violet/8 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet/70 mb-3">The Question</p>
          <p className="text-lg font-semibold text-white leading-7">
            {platformQuestion ?? "Loading question..."}
          </p>
        </div>

        {phase === "PLATFORM_WAIT" && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-white/60">
                {hasMyAnswer ? (
                  <span className="text-emerald font-semibold">✔ Your answer is locked in. Waiting for {partnerName}...</span>
                ) : (
                  "Write your honest answer. You won't see theirs until both are in."
                )}
              </p>
              {!hasMyAnswer && <TimerRing remaining={remaining} pct={pct} urgent={urgent} />}
            </div>

            {!hasMyAnswer && (
              <>
                <div className="relative mb-4">
                  <textarea
                    className="focus-ring w-full resize-none rounded-xl border border-white/12 bg-black/25 p-4 pr-12 text-sm text-white placeholder:text-white/30 min-h-[100px]"
                    value={myAnswer}
                    onChange={(e) => setMyAnswer(e.target.value)}
                    placeholder="Your honest answer..."
                    maxLength={500}
                  />
                  <label className="absolute right-4 top-4 cursor-pointer text-white/30 hover:text-white transition">
                    <ImageIcon size={22} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                  </label>
                </div>
                {myImage && (
                  <div className="mb-4 relative inline-block">
                    <img src={myImage} alt="Attached" className="h-24 w-24 rounded-md object-cover border border-white/10" />
                    <button onClick={() => setMyImage(null)} className="absolute -top-2 -right-2 rounded-full bg-danger text-white p-1 shadow-md hover:bg-danger/80">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                <ActionButton icon={Send} onClick={submit} disabled={!myAnswer.trim() || isSubmitting || platformAnswered} className="w-full">
                  {isSubmitting ? "Locking in..." : "Lock In Answer"}
                </ActionButton>
              </>
            )}
          </>
        )}

        {phase === "PLATFORM_REVEAL" && (
          <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Answers Revealed</p>
            <div className="grid gap-3 sm:grid-cols-2 mb-6">
              <div className="rounded-xl border border-cyan/30 bg-cyan/6 p-4">
                <p className="text-xs font-semibold text-cyan mb-2">{myName}</p>
                <p className="text-sm text-white leading-6 mb-2">{platformAnswers?.[mySlot] ?? "[No answer]"}</p>
                {platformAnswerImages?.[mySlot] && (
                  <img src={platformAnswerImages[mySlot]} alt="Upload" className="mt-2 h-32 w-full max-w-[200px] object-cover rounded-md border border-white/10" />
                )}
              </div>
              <div className="rounded-xl border border-violet/30 bg-violet/6 p-4">
                <p className="text-xs font-semibold text-violet mb-2">{partnerName}</p>
                <p className="text-sm text-white leading-6 mb-2">{platformAnswers?.[partnerSlot] ?? "Waiting..."}</p>
                {platformAnswerImages?.[partnerSlot] && (
                  <img src={platformAnswerImages[partnerSlot]} alt="Upload" className="mt-2 h-32 w-full max-w-[200px] object-cover rounded-md border border-white/10" />
                )}
              </div>
            </div>

            {/* Honesty judgment on platform reveal */}
            <div className="mb-5 rounded-xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45 mb-3">
                Was {partnerName} being honest?
              </p>
              {hasJudged ? (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                  judgment.verdict === "honest" ? "bg-emerald/14 text-emerald" : "bg-amber-400/14 text-amber-400"
                }`}>
                  {judgment.verdict === "honest" ? <ThumbsUp size={15} /> : <ThumbsDown size={15} />}
                  You rated: {judgment.verdict === "honest" ? "Seemed Honest" : "Kinda Sus"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => onHonestyJudgment("honest")}
                    className="flex items-center justify-center gap-2 rounded-lg border border-emerald/40 bg-emerald/10 px-4 py-3 text-sm font-semibold text-emerald transition hover:bg-emerald/20">
                    <ThumbsUp size={15} /> Honest
                  </button>
                  <button type="button" onClick={() => onHonestyJudgment("sus")}
                    className="flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/20">
                    <ThumbsDown size={15} /> Sus
                  </button>
                </div>
              )}
            </div>

            <ActionButton icon={RotateCcw} onClick={onNextRound} disabled={isSubmitting} className="w-full">
              {roundState.roundNumber >= roundState.maxRounds ? "See Final Results" : "Next Round"}
            </ActionButton>
          </>
        )}
      </section>
    </div>
  );
}

/* ─── Gaali Poster Modal ──────────────────────────────────────────────────────────── */
function GaaaliPoster({ emoji, text, playerName, onClose }) {
  const posterRef = useRef(null);

  async function downloadPoster() {
    if (!posterRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, { backgroundColor: "#0a0a12", scale: 2 });
      const link = document.createElement("a");
      link.download = `veritas-gaali-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) { console.error("Screenshot failed", e); }
  }

  async function sharePoster() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Veritas Title",
          text: `${playerName} earned the title: "${emoji} ${text}" in Veritas! 😂`
        });
      } catch { /* cancelled */ }
    } else {
      downloadPoster();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        className="relative w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Downloadable poster */}
        <div ref={posterRef}
          className="rounded-2xl border border-danger/30 bg-gradient-to-br from-[#1a0020] to-[#0a0012] p-8 text-center shadow-[0_0_60px_rgba(244,63,94,0.3)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-danger/70 mb-6">Timer Expired</p>
          <div className="text-8xl mb-5 leading-none">{emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{playerName}</h2>
          <p className="text-sm text-white/50 mb-4">has earned the official title of</p>
          <div className="rounded-xl border border-danger/40 bg-danger/12 px-5 py-3 mb-6">
            <p className="text-xl font-bold text-danger">{text}</p>
          </div>
          <p className="text-xs text-white/25 tracking-widest">VERITAS — played at room</p>
        </div>

        {/* Action buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={sharePoster}
            className="flex items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/12 px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/22">
            <Share2 size={16} /> Share
          </button>
          <button type="button" onClick={downloadPoster}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/14">
            <Download size={16} /> Save
          </button>
        </div>
        <button type="button" onClick={onClose}
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/50 transition hover:text-white">
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
