"use client";

import { useState, useEffect } from "react";
import { Send, GraduationCap, Building2, HelpCircle, CheckCircle, Award, Calendar, DollarSign, BookOpen, Upload, Trash2, Loader2, FileText, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentItem {
  id: string;
  fileName: string;
}

export default function CollegeAdmissionAgent() {
  const [mode, setMode] = useState<"orchestrate" | "granite">("orchestrate");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string; sources?: string[] }[]>([
    {
      role: "agent",
      text: "Hello! I am your AI College Admission Agent powered by IBM watsonx Orchestrate. I can guide you through course selection, eligibility criteria, fee structures, and application deadlines. What would you like to know today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);

  // Granite RAG Specific States
  const [uploadedFiles, setUploadedFiles] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverOffline, setServerOffline] = useState(false);

  // Dynamic API Base URL detection
  // Uses NEXT_PUBLIC_API_URL environment variable for deployed backend
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://college-admission-agent.onrender.com";

  const quickLinks = [
    {
      title: "Fee Structure",
      icon: <DollarSign className="text-blue-400" size={20} />,
      question: "What is the fee structure for B.Tech CS?",
      desc: "Check tuition fees, lab fees, and refund policies.",
    },
    {
      title: "Admission Deadlines",
      icon: <Calendar className="text-emerald-400" size={20} />,
      question: "When is the application deadline for Fall semester?",
      desc: "Find regular and priority admission timelines.",
    },
    {
      title: "Scholarship Schemes",
      icon: <Award className="text-purple-400" size={20} />,
      question: "Does the college offer scholarships?",
      desc: "Learn about merit-based and need-based support.",
    },
    {
      title: "Eligibility Criteria",
      icon: <BookOpen className="text-orange-400" size={20} />,
      question: "What are the eligibility criteria for Data Science?",
      desc: "Verify grades and test score requirements.",
    },
  ];

  // Load uploaded documents for Granite Sandbox (safely)
  const fetchDocuments = async () => {
    try {
      setServerOffline(false);
      const response = await fetch(`${API_BASE_URL}/api/documents`);
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.documents || []);
      } else {
        setUploadedFiles([]);
      }
    } catch (error) {
      console.warn("Failed to fetch documents (server offline):", error);
      setServerOffline(true);
      setUploadedFiles([]);
    }
  };

  useEffect(() => {
    if (mode === "granite") {
      fetchDocuments();
      setMessages([
        {
          role: "agent",
          text: "Welcome to the Custom PDF Sandbox! Upload any PDF document (brochure, syllabus, or FAQ sheet) in the left panel, and I will answer your questions based strictly on the content of that document.",
        },
      ]);
    } else {
      setMessages([
        {
          role: "agent",
          text: "Hello! I am your AI College Admission Agent powered by IBM watsonx Orchestrate. I can guide you through course selection, eligibility criteria, fee structures, and application deadlines. What would you like to know today?",
        },
      ]);
    }
  }, [mode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFiles[0]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments();
      } else {
        const err = await response.json();
        setUploadError(err.error || "Failed to upload document.");
      }
    } catch (error) {
      setUploadError("Unable to connect to the backend server.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setUploadedFiles((prev) => prev.filter((doc) => doc.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setAsking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: textToSend,
          mode: mode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: "agent", text: data.answer, sources: data.sources }]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        let errMsg = errorData.error || "Failed to reach the agent.";
        if (errorData.details) {
          errMsg += ` (Details: ${errorData.details})`;
        }
        if (mode === "orchestrate") {
          errMsg += " Please verify your ORCHESTRATE_AGENT_ID inside the backend .env configuration.";
        } else {
          errMsg += " Please ensure your IBM_PROJECT_ID and WML settings are active in the backend .env config.";
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            text: `Error: ${errMsg}`,
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Cannot connect to the admission agent server. Please make sure the backend is running.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-blue-500/30 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GraduationCap size={18} className="text-white" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">College Admission Agent</h1>
          </div>

          {/* Top Mode Badge */}
          <div className="flex items-center gap-2 text-xs font-medium text-white/60 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${mode === "orchestrate" ? "bg-blue-500 animate-pulse" : "bg-purple-500 animate-pulse"}`}></div>
            {mode === "orchestrate" ? "Powered by watsonx Orchestrate" : "Powered by IBM Granite RAG"}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Mode Selector & Mode panels */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
          
          {/* Mode Switcher */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-1.5 flex gap-1 shadow-inner">
            <button
              onClick={() => setMode("orchestrate")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${
                mode === "orchestrate"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Official College Agent
            </button>
            <button
              onClick={() => setMode("granite")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${
                mode === "granite"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Custom PDF Sandbox
            </button>
          </div>

          {mode === "orchestrate" ? (
            /* watsonx Orchestrate Info Panel */
            <div className="flex flex-col gap-6">
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <Building2 size={20} className="text-blue-400" />
                  Information Portal
                </h2>
                <p className="text-sm text-white/50 mb-6">
                  Ask any prospective student questions. The AI agent uses official Institutional Databases to instantly retrieve and summarize answers.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold">Official Database Connected</h4>
                      <p className="text-xs text-white/40 mt-0.5">Policies, deadlines, fees, and requirements are fully indexed.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold">Real-Time Verification</h4>
                      <p className="text-xs text-white/40 mt-0.5">IBM's Orchestration enforces strict data guardrails on responses.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Inquiries */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <HelpCircle size={14} /> Quick Inquiries
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {quickLinks.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(null as any, item.question)}
                      className="text-left bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-200 group flex items-start gap-4"
                    >
                      <div className="p-2.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Custom PDF Sandbox Panel */
            <div className="flex flex-col gap-6">
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <Upload size={20} className="text-purple-400" />
                  PDF Ingestion
                </h2>
                <p className="text-sm text-white/50 mb-6">
                  Upload a custom brochure, program syllabus, or class schedules PDF. Ask questions and get real-time analysis strictly from your document.
                </p>

                {/* Upload Trigger */}
                <label className="border-2 border-dashed border-white/10 hover:border-purple-500/40 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/[0.01] transition-all group relative overflow-hidden">
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading || serverOffline} />
                  {uploading ? (
                    <Loader2 size={24} className="text-purple-500 animate-spin" />
                  ) : (
                    <Upload size={24} className="text-white/40 group-hover:text-purple-400 transition-colors" />
                  )}
                  <span className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                    {uploading ? "Analyzing Document..." : "Upload Brochure PDF"}
                  </span>
                  <span className="text-[10px] text-white/40">PDF Format (Max 10MB)</span>
                </label>

                {uploadError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {serverOffline && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>Go server is currently offline or unreachable. Please restart backend.</span>
                  </div>
                )}
              </div>

              {/* Indexed Files Area */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <FileText size={14} /> Indexed Brochure Docs
                </h3>

                {uploadedFiles.length === 0 ? (
                  <p className="text-xs text-white/40">No documents indexed in Sandbox yet. Drag & drop a brochure to analyze!</p>
                ) : (
                  <div className="space-y-2">
                    {uploadedFiles.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText size={14} className="text-purple-400 shrink-0" />
                          <span className="text-xs font-medium text-white/80 truncate">{doc.fileName}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-white/40 hover:text-red-400 p-1.5 rounded-lg transition-colors shrink-0"
                          title="Remove document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Conversational Interface */}
        <div className="col-span-1 lg:col-span-8 flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden h-[calc(100vh-8rem)] shadow-2xl">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-5 ${
                      msg.role === "user"
                        ? mode === "orchestrate"
                          ? "bg-blue-600 text-white rounded-br-sm shadow-lg shadow-blue-900/20"
                          : "bg-purple-600 text-white rounded-br-sm shadow-lg shadow-purple-900/20"
                        : "bg-white/5 border border-white/10 text-white/90 rounded-bl-sm"
                    }`}
                  >
                    <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                          Sources Referenced
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(msg.sources)).map((src, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-black/40 border border-white/10 px-2 py-1 rounded-md text-white/60 flex items-center gap-1"
                            >
                              <BookOpen size={10} />
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {asking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm p-5 flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full animate-bounce ${mode === "orchestrate" ? "bg-blue-500" : "bg-purple-500"} [animation-delay:-0.3s]`}></div>
                    <div className={`w-2.5 h-2.5 rounded-full animate-bounce ${mode === "orchestrate" ? "bg-blue-500" : "bg-purple-500"} [animation-delay:-0.15s]`}></div>
                    <div className={`w-2.5 h-2.5 rounded-full animate-bounce ${mode === "orchestrate" ? "bg-blue-500" : "bg-purple-500"}`}></div>
                  </div>
                  <span className="text-sm text-white/50 font-medium">
                    {mode === "orchestrate" ? "watsonx Orchestrate is analyzing your inquiry..." : "IBM Granite RAG is searching your document..."}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Chat Bar */}
          <div className="p-4 bg-black/40 border-t border-white/10">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "orchestrate" ? "Ask a question about admission guidelines, fees, courses, or deadlines..." : "Ask any question about your uploaded brochure..."}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-5 pr-14 py-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim() || asking}
                className={`absolute right-2 w-10 h-10 rounded-lg disabled:bg-white/10 disabled:text-white/30 text-white flex items-center justify-center transition-colors ${
                  mode === "orchestrate" ? "bg-blue-600 hover:bg-blue-500" : "bg-purple-600 hover:bg-purple-500"
                }`}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
