import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, BookOpen, CheckCircle, AlertCircle, Loader2, Plus, Minus, ShieldCheck } from "lucide-react";

const AGE_GROUPS = [
  {
    value: "elementary-k2",
    label: "Elementary K–2",
    ages: "Ages 5–7",
    lexile: "Lexile 100–300",
    defaultWordCount: 2000,
    defaultChapters: 5,
    defaultChapterLength: 400,
    color: "bg-green-50 border-green-200 text-green-800",
    activeColor: "bg-green-600 border-green-600 text-white",
  },
  {
    value: "elementary-35",
    label: "Elementary 3–5",
    ages: "Ages 8–11",
    lexile: "Lexile 400–700",
    defaultWordCount: 8000,
    defaultChapters: 8,
    defaultChapterLength: 1000,
    color: "bg-blue-50 border-blue-200 text-blue-800",
    activeColor: "bg-blue-600 border-blue-600 text-white",
  },
  {
    value: "middle-school",
    label: "Middle School",
    ages: "Ages 11–14",
    lexile: "Lexile 600–1000",
    defaultWordCount: 35000,
    defaultChapters: 20,
    defaultChapterLength: 1750,
    color: "bg-purple-50 border-purple-200 text-purple-800",
    activeColor: "bg-purple-600 border-purple-600 text-white",
  },
  {
    value: "high-school",
    label: "High School",
    ages: "Ages 14–18",
    lexile: "Lexile 900–1200",
    defaultWordCount: 60000,
    defaultChapters: 25,
    defaultChapterLength: 2400,
    color: "bg-orange-50 border-orange-200 text-orange-800",
    activeColor: "bg-orange-600 border-orange-600 text-white",
  },
];

const EDUCATIONAL_SUBJECTS = {
  "educational-fiction": [
    { value: "historical-fiction", label: "Historical Fiction", factCheck: true },
    { value: "science-adventure", label: "Science Adventure", factCheck: false },
    { value: "environmental", label: "Environmental & Nature", factCheck: false },
    { value: "cultural-fiction", label: "Cultural & Social Fiction", factCheck: false },
    { value: "biography-fiction", label: "Biographical Fiction", factCheck: true },
    { value: "mystery-solving", label: "Mystery & Problem-Solving", factCheck: false },
    { value: "fantasy-educational", label: "Educational Fantasy", factCheck: false },
    { value: "social-emotional", label: "Social-Emotional Learning", factCheck: false },
  ],
  "educational-nonfiction": [
    { value: "stem", label: "STEM (Science, Technology, Engineering, Math)", factCheck: true },
    { value: "history-social", label: "History & Social Studies", factCheck: true },
    { value: "biography", label: "Biography & Memoir", factCheck: true },
    { value: "geography", label: "Geography & Culture", factCheck: true },
    { value: "health-wellness", label: "Health & Wellness", factCheck: true },
    { value: "language-arts", label: "Language Arts & Literature", factCheck: false },
    { value: "arts-music", label: "Arts & Music", factCheck: false },
    { value: "civics", label: "Civics & Government", factCheck: true },
  ],
};

const WORD_COUNT_OPTIONS = [
  { label: "Early Reader (1K)", value: 1000 },
  { label: "Early Chapter (2K)", value: 2000 },
  { label: "Short Chapter (5K)", value: 5000 },
  { label: "Chapter Book (8K)", value: 8000 },
  { label: "Standard (15K)", value: 15000 },
  { label: "Middle Grade (25K)", value: 25000 },
  { label: "Full Novel (35K)", value: 35000 },
  { label: "YA Novel (50K)", value: 50000 },
  { label: "Extended (65K)", value: 65000 },
];

interface Props {
  onSeriesCreated?: (seriesId: string, novels: any[]) => void;
}

export default function EducationalGenerator({ onSeriesCreated }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [contentType, setContentType] = useState<"educational-fiction" | "educational-nonfiction">("educational-fiction");
  const [ageGroup, setAgeGroup] = useState("elementary-35");
  const [subject, setSubject] = useState("");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [numberOfBooks, setNumberOfBooks] = useState(1);
  const [targetWordCount, setTargetWordCount] = useState<number | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");

  const selectedAgeGroup = AGE_GROUPS.find(a => a.value === ageGroup) || AGE_GROUPS[1];
  const subjects = EDUCATIONAL_SUBJECTS[contentType];
  const selectedSubject = subjects.find(s => s.value === subject);
  const effectiveWordCount = targetWordCount || selectedAgeGroup.defaultWordCount;

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/novels/educational-series", "POST", {
        seriesTitle: seriesTitle.trim(),
        subject,
        contentType,
        ageGroup,
        topic: topic.trim(),
        numberOfBooks,
        targetWordCount: effectiveWordCount,
        targetChapterCount: selectedAgeGroup.defaultChapters,
        targetChapterLength: selectedAgeGroup.defaultChapterLength,
        customInstructions: customInstructions.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/novels"] });
      toast({
        title: numberOfBooks > 1 ? "Series generation started!" : "Book generation started!",
        description: numberOfBooks > 1
          ? `Creating "${seriesTitle}" — ${numberOfBooks} books are being generated. Check your library for progress.`
          : `Creating "${seriesTitle}" — your book is being generated. Check your library for progress.`,
      });
      onSeriesCreated?.(data.seriesId, data.novels);
    },
    onError: (err: any) => {
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to start generation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesTitle.trim()) return toast({ title: "Title required", description: "Please enter a series or book title.", variant: "destructive" });
    if (!subject) return toast({ title: "Subject required", description: "Please select a subject.", variant: "destructive" });
    if (!topic.trim()) return toast({ title: "Topic required", description: "Please describe the topic or story.", variant: "destructive" });
    generateMutation.mutate();
  };

  const estimatedPages = Math.round(effectiveWordCount / 250);
  const estimatedReadingTime = Math.round(effectiveWordCount / 250);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Content Type Toggle */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Content Type</p>
        <div className="grid grid-cols-2 gap-3">
          {(["educational-fiction", "educational-nonfiction"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { setContentType(type); setSubject(""); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                contentType === type
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className={`h-4 w-4 ${contentType === type ? "text-indigo-600" : "text-slate-400"}`} />
                <span className={`font-semibold text-sm ${contentType === type ? "text-indigo-700" : "text-slate-700"}`}>
                  {type === "educational-fiction" ? "Educational Fiction" : "Educational Non-Fiction"}
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-6">
                {type === "educational-fiction"
                  ? "Stories that teach — historical fiction, science adventures, biographies"
                  : "Fact-based learning — STEM, history, geography, civics"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Fact-check notice */}
      {selectedSubject?.factCheck && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Fact-Checked & Verified</p>
            <p className="text-xs text-green-700 mt-0.5">
              Content for this subject will be fact-checked against credible academic, journalistic, and expert sources.
              A bibliography will be automatically generated. Wikipedia, Reddit, Quora, and unreliable sources are excluded.
            </p>
          </div>
        </div>
      )}

      {/* Age Group */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Age Group</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AGE_GROUPS.map((ag) => (
            <button
              key={ag.value}
              type="button"
              onClick={() => {
                setAgeGroup(ag.value);
                setTargetWordCount(null);
              }}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                ageGroup === ag.value ? ag.activeColor : ag.color + " hover:opacity-80"
              }`}
            >
              <div className="font-semibold text-sm">{ag.label}</div>
              <div className={`text-xs mt-0.5 ${ageGroup === ag.value ? "opacity-80" : "opacity-70"}`}>{ag.ages}</div>
              <div className={`text-xs mt-0.5 ${ageGroup === ag.value ? "opacity-70" : "opacity-50"}`}>{ag.lexile}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          {contentType === "educational-fiction" ? "Fiction Genre" : "Subject Area"}
        </label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a subject..." />
          </SelectTrigger>
          <SelectContent>
            {subjects.map(s => (
              <SelectItem key={s.value} value={s.value}>
                <div className="flex items-center gap-2">
                  {s.factCheck && <ShieldCheck className="h-3 w-3 text-green-500" />}
                  {s.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Series Title */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          {numberOfBooks > 1 ? "Series Title" : "Book Title"}
        </label>
        <Input
          value={seriesTitle}
          onChange={e => setSeriesTitle(e.target.value)}
          placeholder={numberOfBooks > 1 ? 'e.g. "Adventures in Ancient History"' : 'e.g. "The Water Cycle"'}
          className="w-full"
        />
      </div>

      {/* Topic / Description */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          {contentType === "educational-fiction" ? "Story Concept & Educational Theme" : "Topic & Learning Goals"}
        </label>
        <Textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder={
            contentType === "educational-fiction"
              ? "Describe the story concept and what students should learn. E.g. 'A young girl travels through ancient Rome, learning about daily life, government, and the fall of the empire...'"
              : "Describe the topic and what readers should understand. E.g. 'An introduction to photosynthesis and plant biology, covering chlorophyll, the carbon cycle, and ecosystems...'"
          }
          className="min-h-[100px]"
        />
      </div>

      {/* Number of Books */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Number of Books in Series
          {numberOfBooks > 1 && (
            <span className="ml-2 text-xs font-normal text-slate-500">
              — All {numberOfBooks} books generated as a cohesive series
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNumberOfBooks(Math.max(1, numberOfBooks - 1))}
            className="h-9 w-9 rounded-full border-2 border-slate-200 flex items-center justify-center hover:border-indigo-400 transition-colors"
          >
            <Minus className="h-4 w-4 text-slate-600" />
          </button>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNumberOfBooks(n)}
                className={`h-9 w-9 rounded-lg border-2 text-sm font-medium transition-all ${
                  numberOfBooks === n
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setNumberOfBooks(Math.min(8, numberOfBooks + 1))}
            className="h-9 w-9 rounded-full border-2 border-slate-200 flex items-center justify-center hover:border-indigo-400 transition-colors"
          >
            <Plus className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Book Length */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          Book Length
          <span className="ml-2 text-xs font-normal text-slate-500">
            (default for {selectedAgeGroup.label}: {selectedAgeGroup.defaultWordCount.toLocaleString()} words)
          </span>
        </label>
        <Select
          value={String(effectiveWordCount)}
          onValueChange={v => setTargetWordCount(Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORD_COUNT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label} — ~{Math.round(opt.value / 250)} pages
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-1.5">
          Estimated: ~{estimatedPages} pages per book{numberOfBooks > 1 ? `, ${(estimatedPages * numberOfBooks).toLocaleString()} pages total` : ""}
        </p>
      </div>

      {/* Custom Instructions */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          Additional Instructions <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <Textarea
          value={customInstructions}
          onChange={e => setCustomInstructions(e.target.value)}
          placeholder="E.g. 'Include discussion questions at the end of each chapter', 'Focus on primary sources', 'Include a glossary of key terms'..."
          className="min-h-[70px]"
        />
      </div>

      {/* Summary bar */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xs text-indigo-500 font-medium">Age Group</p>
            <p className="text-sm font-bold text-indigo-900">{selectedAgeGroup.label}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 font-medium">Books</p>
            <p className="text-sm font-bold text-indigo-900">{numberOfBooks}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 font-medium">Words/Book</p>
            <p className="text-sm font-bold text-indigo-900">{effectiveWordCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 font-medium">Fact-Checked</p>
            <p className="text-sm font-bold text-indigo-900">{selectedSubject?.factCheck ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={generateMutation.isPending || !seriesTitle.trim() || !subject || !topic.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-semibold"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Starting generation...
          </>
        ) : (
          <>
            <GraduationCap className="mr-2 h-5 w-5" />
            {numberOfBooks > 1
              ? `Generate ${numberOfBooks}-Book Series`
              : "Generate Educational Book"}
          </>
        )}
      </Button>
    </form>
  );
}
