import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Copy,
  DoorOpen,
  Eye,
  KeyRound,
  LockKeyhole,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  Users
} from "lucide-react";
import ActionButton from "./components/ActionButton.jsx";
import ChoiceCard from "./components/ChoiceCard.jsx";
import Logo from "./components/Logo.jsx";
import ProgressHeader from "./components/ProgressHeader.jsx";
import ResultsChart from "./components/ResultsChart.jsx";
import TruthLieToggle from "./components/TruthLieToggle.jsx";
import { createSocket } from "./lib/socket.js";

const serverUrl = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

const relationships = [
  {
    type: "romantic",
    label: "BF/GF or partners",
    description: "Emotionally close, but some answers can create friction fast."
  },
  {
    type: "friends",
    label: "Friends",
    description: "Casual read based on habits, jokes, and patterns."
  },
  {
    type: "close_friends",
    label: "Close friends",
    description: "You know each other very well, so wrong guesses hit harder."
  },
  {
    type: "siblings",
    label: "Brother/sister/siblings",
    description: "Shared history, but a few things still feel hard to say."
  },
  {
    type: "mentor_friend",
    label: "Mentor and friend",
    description: "Trust mixed with respect, image, and careful honesty."
  },
  {
    type: "just_close",
    label: "Just close to each other",
    description: "The bond is real, but the boundaries are still unclear."
  }
];

const emptyDraft = {
  category: "Custom",
  prompt: "",
  options: ["", "", "", ""],
  source: "custom",
  basePrompt: ""
};

const archetypeCopy = {
  "The Standard Script":
    "Your choices followed stable, readable patterns under pressure. Comfort, order, and low-friction decisions dominated the signal.",
  "The Guarded Citizen":
    "You balanced disclosure with self-protection. The observer could read some routines, but your motives kept enough edge to resist easy profiling.",
  "The Wildcard":
    "Your answers leaned unconventional and harder to model. The observer saw fragments of intent, but your pattern resisted a clean prediction.",
  "The Enigma":
    "Your signal was volatile and difficult to decode. Familiar expectations broke down quickly, leaving perception with very little reliable footing."
};

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
  const [roundState, setRoundState] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isLie, setIsLie] = useState(false);
  const [guessChoice, setGuessChoice] = useState(null);
  const [guessIsLie, setGuessIsLie] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [countdown, setCountdown] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [finalMetrics, setFinalMetrics] = useState(null);
  const [roundHistory, setRoundHistory] = useState([]);
  const [resultsMeta, setResultsMeta] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (screen === "admin") {
      window.history.replaceState(null, "", "/admin");
      return;
    }
    const nextPath = screen === "results" ? "/results" : screen === "lobby" || screen === "waiting" ? "/lobby" : "/play";
    window.history.replaceState(null, "", nextPath);
  }, [screen]);

  useEffect(() => {
    if (normalizePathScreen() === "admin") return undefined;

    const activeSocket = createSocket();
    socketRef.current = activeSocket;

    const acceptRoundState = (payload) => {
      setRoundState(payload);
      setRoomCode(payload.roomCode);
      setSelectedChoice(null);
      setIsLie(false);
      setGuessChoice(null);
      setGuessIsLie(false);
      setDraft(emptyDraft);
      setCountdown(null);
      setReveal(null);
      setIsSubmitting(false);
      setScreen("play");
      vibrate([10, 20, 10]);
    };

    activeSocket.on("room_created", ({ roomCode: createdCode }) => {
      setRoomCode(createdCode);
      setScreen("waiting");
      setError("");
      vibrate();
    });

    activeSocket.on("joined_room", ({ roomCode: joinedCode }) => {
      setRoomCode(joinedCode);
      setError("");
      vibrate();
    });

    activeSocket.on("player_joined", ({ playersCount: nextCount }) => {
      setPlayersCount(nextCount);
    });

    activeSocket.on("game_started", acceptRoundState);
    activeSocket.on("question_ready", acceptRoundState);
    activeSocket.on("target_submitted", acceptRoundState);

    activeSocket.on("reveal_countdown", ({ count }) => {
      setCountdown(count);
      setScreen("reveal");
      vibrate(25);
    });

    activeSocket.on("reveal_round", (payload) => {
      setReveal(payload);
      setCountdown(null);
      setIsSubmitting(false);
      setScreen("reveal");
      vibrate([20, 30, 20]);
    });

    activeSocket.on("game_over", ({ finalMetrics: metrics, roundHistory: history, players, relationship }) => {
      setFinalMetrics(metrics);
      setRoundHistory(history);
      setResultsMeta({ players, relationship });
      setScreen("results");
      setIsSubmitting(false);
      vibrate([30, 40, 30]);
    });

    activeSocket.on("player_disconnected", () => {
      setError("The other player disconnected. Create a new private room to continue.");
      setScreen("lobby");
      setPlayersCount(0);
      setRoomCode("");
      setRoundState(null);
    });

    activeSocket.on("game_error", ({ message }) => {
      setError(message);
      setIsSubmitting(false);
    });

    return () => {
      activeSocket.disconnect();
    };
  }, []);

  const roomReady = useMemo(() => joinCode.trim().length === 6, [joinCode]);
  const nameReady = useMemo(() => playerName.trim().length >= 2, [playerName]);
  const currentQuestion = roundState?.currentQuestion;
  const canSubmitTarget = selectedChoice !== null && !isSubmitting;
  const canSubmitGuess = guessChoice !== null && !isSubmitting;
  const canSubmitQuestion =
    draft.prompt.trim().length > 8 && draft.options.filter((option) => option.trim()).length >= 3 && !isSubmitting;

  function resetLocalState() {
    setScreen("lobby");
    setRoomCode("");
    setJoinCode("");
    setPlayersCount(0);
    setRoundState(null);
    setSelectedChoice(null);
    setGuessChoice(null);
    setReveal(null);
    setFinalMetrics(null);
    setRoundHistory([]);
    setResultsMeta(null);
    setError("");
    setIsSubmitting(false);
  }

  function createRoom() {
    if (!nameReady) {
      setError("Enter your name first.");
      return;
    }
    setError("");
    socketRef.current?.emit("create_room", {
      playerName: playerName.trim(),
      relationshipType,
      maxRounds: 10
    });
  }

  function joinRoom(event) {
    event.preventDefault();
    if (!roomReady || !nameReady) {
      setError("Enter your name and a valid room code.");
      return;
    }
    setError("");
    socketRef.current?.emit("join_room", {
      roomCode: joinCode.trim(),
      playerName: playerName.trim()
    });
  }

  function submitRoundQuestion() {
    if (!canSubmitQuestion) return;
    setIsSubmitting(true);
    socketRef.current?.emit("submit_round_question", {
      roomCode,
      question: {
        category: draft.category,
        prompt: draft.prompt,
        options: draft.options,
        source: draft.source
      }
    });
  }

  function submitTargetMove() {
    if (!canSubmitTarget) return;
    setIsSubmitting(true);
    socketRef.current?.emit("submit_target_move", {
      roomCode,
      optionIndex: selectedChoice,
      isLie
    });
  }

  function submitGuess() {
    if (!canSubmitGuess) return;
    setIsSubmitting(true);
    socketRef.current?.emit("submit_guest_guess", {
      roomCode,
      guessedChoice: guessChoice,
      guessedIsLie: guessIsLie
    });
  }

  function nextRound() {
    setIsSubmitting(true);
    socketRef.current?.emit("next_round", { roomCode });
  }

  function shareReport() {
    const text = `VERITAS report: ${finalMetrics?.totalPredictabilityIndex ?? 0}% predictable - ${finalMetrics?.archetypeLabel ?? "Unscored"}`;
    if (navigator.share) {
      navigator.share({ title: "Veritas Report", text }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(text);
  }

  if (screen === "admin") {
    return <AdminDashboard onExit={() => { window.location.href = "/lobby"; }} />;
  }

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
            draft={draft}
            setDraft={setDraft}
            selectedChoice={selectedChoice}
            setSelectedChoice={setSelectedChoice}
            isLie={isLie}
            setIsLie={setIsLie}
            guessChoice={guessChoice}
            setGuessChoice={setGuessChoice}
            guessIsLie={guessIsLie}
            setGuessIsLie={setGuessIsLie}
            canSubmitQuestion={canSubmitQuestion}
            canSubmitTarget={canSubmitTarget}
            canSubmitGuess={canSubmitGuess}
            isSubmitting={isSubmitting}
            onSubmitQuestion={submitRoundQuestion}
            onSubmitTarget={submitTargetMove}
            onSubmitGuess={submitGuess}
            error={error}
          />
        )}

        {screen === "reveal" && (roundState?.currentQuestion || reveal?.question) && (
          <RevealScreen
            key="reveal"
            roomCode={roomCode}
            roundState={roundState}
            countdown={countdown}
            reveal={reveal}
            isSubmitting={isSubmitting}
            onNextRound={nextRound}
          />
        )}

        {screen === "results" && finalMetrics && (
          <ResultsScreen
            key="results"
            finalMetrics={finalMetrics}
            roundHistory={roundHistory}
            resultsMeta={resultsMeta}
            onPlayAgain={resetLocalState}
            onShare={shareReport}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function PageShell({ children, className = "" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function TextInput(props) {
  return (
    <input
      className="focus-ring touch-target w-full rounded-lg border border-white/12 bg-black/25 px-4 text-white placeholder:text-white/30"
      {...props}
    />
  );
}

function LobbyScreen(props) {
  const {
    screen,
    roomCode,
    joinCode,
    setJoinCode,
    roomReady,
    playersCount,
    error,
    playerName,
    setPlayerName,
    relationshipType,
    setRelationshipType,
    nameReady,
    onCreate,
    onJoin
  } = props;

  return (
    <PageShell className="justify-center gap-6">
      <Logo />
      <div className="mx-auto w-full max-w-4xl">
        <section className="glass-panel mb-4 rounded-xl p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Identity</p>
              <TextInput
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Your name"
                aria-label="Your name"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">Relationship Hint</p>
              <select
                className="focus-ring touch-target w-full rounded-lg border border-white/12 bg-black/25 px-4 text-white"
                value={relationshipType}
                onChange={(event) => setRelationshipType(event.target.value)}
              >
                {relationships.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label} ({item.description})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <motion.div whileHover={{ y: -2 }} className="glass-panel rounded-xl p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-cyan">Start</p>
                <h1 className="mt-2 text-2xl font-semibold text-white">Create Private Room</h1>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan/14 text-cyan">
                <Plus size={24} aria-hidden="true" />
              </div>
            </div>
            <ActionButton icon={LockKeyhole} className="w-full" onClick={onCreate} disabled={!nameReady}>
              Create Room
            </ActionButton>
          </motion.div>

          <motion.form whileHover={{ y: -2 }} onSubmit={onJoin} className="glass-panel rounded-xl p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald">Join</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Enter 6-Digit Code</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald/14 text-emerald">
                <DoorOpen size={24} aria-hidden="true" />
              </div>
            </div>
            <input
              className="focus-ring touch-target mb-3 w-full rounded-lg border border-white/12 bg-black/25 px-4 text-center text-2xl font-semibold tracking-[0.28em] text-white placeholder:text-white/22"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              aria-label="Room code"
            />
            <ActionButton icon={Users} className="w-full" disabled={!roomReady || !nameReady}>
              Join Room
            </ActionButton>
          </motion.form>
        </div>
      </div>

      {screen === "waiting" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel mx-auto flex w-full max-w-md flex-col items-center rounded-xl p-6 text-center"
        >
          <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-cyan/30">
            <span className="absolute h-full w-full animate-ping rounded-full border border-cyan/40" />
            <Eye className="text-cyan" size={32} aria-hidden="true" />
          </div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/45">Room {roomCode}</p>
          <h2 className="mt-2 text-xl font-semibold">Waiting for Player 2</h2>
          <p className="mt-2 text-sm text-white/55">{playersCount}/2 linked</p>
        </motion.div>
      )}

      {error ? <p className="mx-auto max-w-xl text-center text-sm text-danger">{error}</p> : null}
    </PageShell>
  );
}

function PlayScreen(props) {
  const {
    roomCode,
    roundState,
    draft,
    setDraft,
    selectedChoice,
    setSelectedChoice,
    isLie,
    setIsLie,
    guessChoice,
    setGuessChoice,
    guessIsLie,
    setGuessIsLie,
    canSubmitQuestion,
    canSubmitTarget,
    canSubmitGuess,
    isSubmitting,
    onSubmitQuestion,
    onSubmitTarget,
    onSubmitGuess,
    error
  } = props;

  const isTarget = roundState.myRole === "target";
  const isObserver = roundState.myRole === "observer";
  const question = roundState.currentQuestion;

  return (
    <div className="min-h-screen">
      <ProgressHeader roomCode={roomCode} roundNumber={roundState.roundNumber} maxRounds={roundState.maxRounds} />
      <PageShell className="min-h-[calc(100vh-88px)] gap-4 py-4">
        <RoundStatus roundState={roundState} />

        {roundState.phase === "QUESTION_SELECTION" && isObserver ? (
          <QuestionComposer
            roundState={roundState}
            draft={draft}
            setDraft={setDraft}
            canSubmit={canSubmitQuestion}
            isSubmitting={isSubmitting}
            onSubmit={onSubmitQuestion}
          />
        ) : roundState.phase === "QUESTION_SELECTION" ? (
          <WaitingPanel title={`${roundState.observerPlayer.name} is writing your question`} body="The question appears after they pick an AI draft or type their own." />
        ) : (
          <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <QuestionPanel question={question} roundState={roundState} />
            <div className="glass-panel rounded-xl p-4 sm:p-5">
              {roundState.phase === "TARGET_ANSWER" && isTarget ? (
                <TargetPanel
                  question={question}
                  selectedChoice={selectedChoice}
                  setSelectedChoice={setSelectedChoice}
                  isLie={isLie}
                  setIsLie={setIsLie}
                  canSubmit={canSubmitTarget}
                  isSubmitting={isSubmitting}
                  onSubmit={onSubmitTarget}
                />
              ) : roundState.phase === "TARGET_ANSWER" ? (
                <WaitingPanel title={`${roundState.targetPlayer.name} is choosing`} body="Their answer is hidden until you make the read." />
              ) : roundState.phase === "OBSERVER_GUESS" && isObserver ? (
                <ObserverPanel
                  question={question}
                  guessChoice={guessChoice}
                  setGuessChoice={setGuessChoice}
                  guessIsLie={guessIsLie}
                  setGuessIsLie={setGuessIsLie}
                  canSubmit={canSubmitGuess}
                  isSubmitting={isSubmitting}
                  onSubmit={onSubmitGuess}
                />
              ) : (
                <WaitingPanel title={`${roundState.observerPlayer.name} is reading the answer`} body="Hold steady. The reveal comes after their prediction." />
              )}
            </div>
          </div>
        )}

        {error ? <p className="text-center text-sm text-danger">{error}</p> : null}
      </PageShell>
    </div>
  );
}

function RoundStatus({ roundState }) {
  return (
    <section className="glass-panel mx-auto grid w-full max-w-6xl gap-3 rounded-xl p-4 sm:grid-cols-3">
      <StatusChip label="You are" value={roundState.myRole === "observer" ? "Asker / Observer" : "Target"} accent="cyan" />
      <StatusChip label="Target" value={roundState.targetPlayer.name} accent="emerald" />
      <StatusChip label="Connection" value={roundState.relationship.label} accent="violet" />
    </section>
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

function QuestionComposer({ roundState, draft, setDraft, canSubmit, isSubmitting, onSubmit }) {
  function useSuggestion(suggestion) {
    setDraft({
      category: suggestion.category,
      prompt: suggestion.prompt,
      options: [...suggestion.options],
      source: "generated",
      basePrompt: suggestion.prompt
    });
  }

  function updateDraft(next) {
    setDraft((current) => {
      const updated = { ...current, ...next };
      if (current.basePrompt && (next.prompt !== undefined || next.options !== undefined)) {
        updated.source = updated.prompt === current.basePrompt ? "generated" : "generated_edited";
      }
      if (!current.basePrompt) updated.source = "custom";
      return updated;
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="glass-panel rounded-xl p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-cyan" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">AI Response</p>
            <h2 className="text-xl font-semibold">Pick a draft, then edit it</h2>
          </div>
        </div>
        <p className="mb-4 rounded-lg border border-white/10 bg-black/18 p-3 text-sm leading-6 text-white/58">
          Based on {roundState.relationship.label}: {roundState.relationship.description}
        </p>
        <div className="grid gap-3">
          {roundState.questionSuggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion.id}
              onClick={() => useSuggestion(suggestion)}
              className="focus-ring rounded-lg border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-cyan/50 hover:bg-cyan/10"
            >
              <p className="mb-2 text-xs font-semibold uppercase text-cyan">{suggestion.category}</p>
              <p className="text-sm font-semibold leading-6 text-white">{suggestion.prompt}</p>
              <p className="mt-2 text-xs text-white/45">Tap to copy this into the editor.</p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-xl p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <PencilLine size={20} className="text-emerald" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald">Main Input</p>
            <h2 className="text-xl font-semibold">Final question for {roundState.targetPlayer.name}</h2>
          </div>
        </div>
        <div className="grid gap-3">
          <TextInput
            value={draft.category}
            onChange={(event) => updateDraft({ category: event.target.value })}
            placeholder="Category"
            aria-label="Question category"
          />
          <textarea
            className="focus-ring min-h-32 w-full resize-none rounded-lg border border-white/12 bg-black/25 p-4 text-white placeholder:text-white/30"
            value={draft.prompt}
            onChange={(event) => updateDraft({ prompt: event.target.value })}
            placeholder="Write or edit the question here..."
          />
          {draft.options.map((option, index) => (
            <TextInput
              key={index}
              value={option}
              onChange={(event) => {
                const options = [...draft.options];
                options[index] = event.target.value;
                updateDraft({ options });
              }}
              placeholder={`Answer option ${index + 1}`}
              aria-label={`Answer option ${index + 1}`}
            />
          ))}
          <div className="rounded-lg border border-white/10 bg-black/18 p-3 text-xs text-white/45">
            Admin source tag: {draft.source === "generated_edited" ? "AI draft edited" : draft.source === "generated" ? "AI draft used" : "Custom typed"}
          </div>
          <ActionButton icon={Send} onClick={onSubmit} disabled={!canSubmit} className="w-full">
            {isSubmitting ? "Sending..." : "Send Question"}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

function QuestionPanel({ question, roundState }) {
  return (
    <motion.article layout className="glass-panel rounded-xl p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-violet/40 bg-violet/15 px-3 py-1 text-xs font-semibold uppercase text-violet-100">
          {question.category}
        </span>
        <span className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
          Asked by {roundState.observerPlayer.name}
        </span>
      </div>
      <h1 className="text-2xl font-semibold leading-tight text-white sm:text-4xl">{question.prompt}</h1>
      <div className="mt-7 grid gap-3">
        {question.options.map((option, index) => (
          <div key={`${option}-${index}`} className="rounded-lg border border-white/8 bg-black/14 p-3 text-sm text-white/68">
            <span className="mr-3 font-semibold text-cyan">{index + 1}</span>
            {option}
          </div>
        ))}
      </div>
    </motion.article>
  );
}

function TargetPanel({ question, selectedChoice, setSelectedChoice, isLie, setIsLie, canSubmit, isSubmitting, onSubmit }) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Your Answer</p>
        <h2 className="mt-2 text-xl font-semibold">Choose, then decide truth or lie</h2>
      </div>
      <div className="grid gap-3">
        {question.options.map((option, index) => (
          <ChoiceCard key={`${option}-${index}`} option={option} index={index} selected={selectedChoice === index} onSelect={setSelectedChoice} />
        ))}
      </div>
      <TruthLieToggle isLie={isLie} onChange={setIsLie} />
      <ActionButton icon={CheckCircle2} onClick={onSubmit} disabled={!canSubmit} className="mt-auto w-full">
        {isSubmitting ? "Locking..." : "Lock In"}
      </ActionButton>
    </div>
  );
}

function ObserverPanel({ question, guessChoice, setGuessChoice, guessIsLie, setGuessIsLie, canSubmit, isSubmitting, onSubmit }) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald">Your Read</p>
        <h2 className="mt-2 text-xl font-semibold">Guess their exact answer</h2>
      </div>
      <div className="grid gap-3">
        {question.options.map((option, index) => (
          <ChoiceCard key={`${option}-${index}`} option={option} index={index} selected={guessChoice === index} onSelect={setGuessChoice} />
        ))}
      </div>
      <TruthLieToggle isLie={guessIsLie} onChange={setGuessIsLie} truthLabel="Told Truth" lieLabel="Told Lie" />
      <ActionButton icon={Eye} onClick={onSubmit} disabled={!canSubmit} className="mt-auto w-full">
        {isSubmitting ? "Reading..." : "Submit Read"}
      </ActionButton>
    </div>
  );
}

function WaitingPanel({ title, body }) {
  return (
    <div className="glass-panel mx-auto flex min-h-[420px] w-full max-w-2xl flex-col items-center justify-center rounded-xl p-6 text-center">
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-cyan/20 bg-cyan/8">
        <span className="absolute h-full w-full animate-ping rounded-full border border-cyan/30" />
        <Sparkles size={34} className="text-cyan" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-white/56">{body}</p>
    </div>
  );
}

function RevealScreen({ roomCode, roundState, countdown, reveal, isSubmitting, onNextRound }) {
  const question = reveal?.question ?? roundState.currentQuestion;
  const choiceCorrect = reveal?.choiceCorrect;
  const lieCorrect = reveal?.lieCorrect;
  const badge = choiceCorrect && lieCorrect ? "READ LIKE A BOOK" : "DECEPTION DETECTED";
  const BadgeIcon = choiceCorrect && lieCorrect ? CheckCircle2 : ShieldAlert;
  const canContinue = reveal && roundState?.myRole === "observer";

  return (
    <div className="min-h-screen">
      <ProgressHeader roomCode={roomCode} roundNumber={roundState.roundNumber} maxRounds={roundState.maxRounds} />
      <PageShell className="min-h-[calc(100vh-88px)] justify-center">
        <div className="glass-panel mx-auto w-full max-w-4xl rounded-xl p-5 sm:p-7">
          {countdown ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/45">Reveal in</p>
              <motion.div key={countdown} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-6 text-8xl font-semibold text-cyan">
                {countdown}
              </motion.div>
            </div>
          ) : reveal ? (
            <div className="grid gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Round Reveal</p>
                  <h1 className="mt-2 text-2xl font-semibold sm:text-4xl">{question.prompt}</h1>
                </div>
                <div className={`inline-flex touch-target items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${choiceCorrect && lieCorrect ? "bg-cyan text-jet shadow-glow" : "bg-danger/18 text-white shadow-[0_0_34px_rgba(244,63,94,0.22)]"}`}>
                  <BadgeIcon size={18} aria-hidden="true" />
                  {badge}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FlipCard label={`${reveal.targetPlayer.name}'s pick`} title={question.options[reveal.targetChoice]} meta={reveal.isLie ? "Framed as lie" : "Framed as truth"} accent="cyan" />
                <FlipCard label={`${reveal.observerPlayer.name}'s read`} title={question.options[reveal.guestChoice]} meta={reveal.guestIsLie ? "Predicted lie" : "Predicted truth"} accent="emerald" />
              </div>

              <div className="rounded-lg border border-white/10 bg-black/22 p-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-white/78">Round Predictability</span>
                  <span className="font-semibold text-cyan">{reveal.normalizedRoundScore}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/8">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${reveal.normalizedRoundScore}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-violet via-cyan to-emerald" />
                </div>
              </div>

              {canContinue ? (
                <ActionButton icon={RotateCcw} onClick={onNextRound} disabled={isSubmitting} className="w-full">
                  {roundState.roundNumber >= roundState.maxRounds ? "Generate Report" : "Next Round"}
                </ActionButton>
              ) : (
                <p className="rounded-lg border border-white/10 bg-white/6 p-4 text-center text-sm text-white/56">
                  Waiting for {roundState.observerPlayer.name} to continue.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </PageShell>
    </div>
  );
}

function FlipCard({ label, title, meta, accent }) {
  const accentClass = accent === "emerald" ? "border-emerald/34 text-emerald" : "border-cyan/34 text-cyan";

  return (
    <motion.div initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.55, ease: "easeOut" }} className={`min-h-56 rounded-xl border bg-white/[0.045] p-5 ${accentClass}`} style={{ transformStyle: "preserve-3d" }}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em]">{label}</p>
      <h2 className="mt-5 text-xl font-semibold leading-snug text-white">{title}</h2>
      <p className="mt-4 text-sm text-white/55">{meta}</p>
    </motion.div>
  );
}

function ResultsScreen({ finalMetrics, roundHistory, resultsMeta, onPlayAgain, onShare }) {
  const score = finalMetrics.totalPredictabilityIndex ?? 0;
  const archetype = finalMetrics.archetypeLabel ?? "The Enigma";

  return (
    <PageShell className="gap-6 py-8">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="glass-panel rounded-xl p-6 text-center sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan">Perception Report</p>
          <div className="relative mx-auto mt-7 flex h-52 w-52 items-center justify-center rounded-full border border-cyan/28 bg-cyan/8 shadow-glow">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 220 220" aria-hidden="true">
              <circle cx="110" cy="110" r="96" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
              <motion.circle cx="110" cy="110" r="96" fill="none" stroke="#06B6D4" strokeLinecap="round" strokeWidth="16" initial={{ pathLength: 0 }} animate={{ pathLength: score / 100 }} transition={{ duration: 1, ease: "easeOut" }} />
            </svg>
            <div>
              <div className="text-6xl font-semibold">{score}%</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">Predictable</div>
            </div>
          </div>
          <h1 className="mt-7 text-3xl font-semibold">{archetype}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/58">{archetypeCopy[archetype]}</p>
          <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-white/42">{resultsMeta?.relationship?.label}: {resultsMeta?.relationship?.description}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ActionButton icon={RotateCcw} variant="secondary" onClick={onPlayAgain}>
              Play Again
            </ActionButton>
            <ActionButton icon={Share2} onClick={onShare}>
              Share Report
            </ActionButton>
          </div>
        </section>

        <section className="glass-panel rounded-xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-emerald" size={22} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Round Memory</h2>
          </div>
          <ResultsChart dimensions={finalMetrics.dimensions} />
          <div className="mt-4 grid max-h-72 gap-3 overflow-auto pr-1">
            {roundHistory.map((round) => (
              <div key={round.roundNumber} className="rounded-lg border border-white/8 bg-black/18 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/45">
                  <span>Round {round.roundNumber}: {round.observerPlayer.name} asked {round.targetPlayer.name}</span>
                  <span>{round.normalizedRoundScore}%</span>
                </div>
                <p className="text-sm font-medium text-white/80">{round.question.prompt}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function AdminDashboard({ onExit }) {
  const [adminKey, setAdminKey] = useState("");
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("");

  async function loadSessions() {
    setStatus("Loading...");
    try {
      const response = await fetch(`${serverUrl}/api/admin/sessions`, {
        headers: { "x-admin-key": adminKey }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Admin request failed.");
      setSessions(data);
      setStatus(`Loaded ${data.length} sessions.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="min-h-screen text-white">
      <PageShell className="gap-5 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan">Admin Only</p>
            <h1 className="mt-2 text-3xl font-semibold">Veritas Session Logs</h1>
          </div>
          <ActionButton icon={Shield} variant="secondary" onClick={onExit}>
            Player App
          </ActionButton>
        </div>
        <section className="glass-panel grid gap-3 rounded-xl p-4 sm:grid-cols-[1fr_auto]">
          <TextInput type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="ADMIN_KEY" aria-label="Admin key" />
          <ActionButton icon={KeyRound} onClick={loadSessions} disabled={!adminKey}>
            Load Logs
          </ActionButton>
        </section>
        {status ? <p className="text-sm text-white/55">{status}</p> : null}
        <div className="grid gap-4">
          {sessions.map((session) => (
            <AdminSessionCard key={session._id} session={session} />
          ))}
        </div>
      </PageShell>
    </main>
  );
}

function AdminSessionCard({ session }) {
  const players = [session.players?.host, session.players?.guest].filter(Boolean);
  return (
    <section className="glass-panel rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/42">Room {session.roomCode}</p>
          <h2 className="mt-1 text-xl font-semibold">{players.map((player) => player.name).join(" vs ") || "Unmatched room"}</h2>
          <p className="mt-1 text-sm text-white/50">{session.relationship?.label} ({session.relationship?.description})</p>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-cyan">{session.status}</span>
      </div>
      <div className="grid gap-3">
        {session.roundsData?.map((round, index) => (
          <details key={`${session._id}-${index}`} className="rounded-lg border border-white/10 bg-black/18 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-white">
              Round {index + 1}: {round.questionAuthorName} asked {round.targetName}
            </summary>
            <div className="mt-3 grid gap-2 text-sm text-white/66">
              <p><span className="text-white/38">Source:</span> {round.question?.source ?? "not submitted"}</p>
              <p><span className="text-white/38">Question:</span> {round.question?.prompt ?? "No question yet"}</p>
              <p><span className="text-white/38">Target answer:</span> {round.targetChoice !== undefined ? round.question?.options?.[round.targetChoice] : "Not answered"} ({round.isLie ? "lie" : round.isLie === false ? "truth" : "pending"})</p>
              <p><span className="text-white/38">Observer guess:</span> {round.observerGuessedChoice !== undefined ? round.question?.options?.[round.observerGuessedChoice] : "Not guessed"} ({round.observerGuessIsLie ? "lie" : round.observerGuessIsLie === false ? "truth" : "pending"})</p>
              <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.035] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Audit</p>
                {(round.auditLog ?? []).map((item, itemIndex) => (
                  <p key={itemIndex} className="mb-1 text-xs leading-5 text-white/55">
                    {new Date(item.at).toLocaleString()} - {item.actorName ?? "System"} - {item.action} - {JSON.stringify(item.details ?? {})}
                  </p>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default App;
