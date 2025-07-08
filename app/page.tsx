"use client";
import React, { useState, useRef, useEffect } from "react";
import { Box, Paper, Typography, TextField, Button, List, ListItem, Avatar, Stack, CircularProgress, Drawer, ListItemButton, ListItemText, Divider, IconButton } from "@mui/material";
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import AddIcon from '@mui/icons-material/Add';
import StopIcon from '@mui/icons-material/Stop';

interface ChatHistory {
  question: string;
  messages: { role: "user" | "ai"; text: string }[];
}

export default function Home() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [lastSentInput, setLastSentInput] = useState("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLastSentInput(input); // 送信時に保持
    const userMessage = { role: "user" as const, text: input };
    setMessages((msgs) => [...msgs, userMessage]);
    setInput("");
    setLoading(true);
    const controller = new AbortController();
    setAbortController(controller);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.answer) {
        const newMessages: { role: "user" | "ai"; text: string }[] = [
          ...messages, 
          userMessage, 
          { role: "ai" as const, text: data.answer }
        ];
        setMessages(newMessages);
        setHistory((prev) => [{ question: input, messages: newMessages }, ...prev]);
        setSelectedHistory(null);
      } else {
        setMessages((msgs) => [...msgs, { role: "ai", text: "AIの回答取得に失敗しました。" }]);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        setMessages((msgs) => [...msgs, { role: "ai", text: "AIの回答生成を中断しました。" }]);
      } else {
        setMessages((msgs) => [...msgs, { role: "ai", text: "AIサーバーとの通信に失敗しました。" }]);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      setInput(lastSentInput); // 入力欄に戻す
    }
  };

  const handleSelectHistory = (idx: number) => {
    setMessages(history[idx].messages);
    setSelectedHistory(idx);
  };

  // サイドバーの幅
  const drawerWidth = 300;

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", width: "100vw", overflowX: "hidden", display: "flex" }}>
      {/* サイドバー表示ボタン（隠れているときのみ） */}
      {!sidebarOpen && (
        <IconButton
          onClick={() => setSidebarOpen(true)}
          sx={{ position: "fixed", top: 24, left: 24, zIndex: 1301, bgcolor: "#fff", boxShadow: 2 }}
        >
          <MenuIcon />
        </IconButton>
      )}
      {/* Gemini風サイドバー */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          display: sidebarOpen ? 'block' : 'none',
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#f8fafc',
            borderRight: '1px solid #e0e0e0',
            px: 2,
            pt: 2,
            pb: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          },
        }}
      >
        <Box>
          {/* 上部：隠すボタン＋新規作成＋書くボタン */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => setSidebarOpen(false)} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'bold', color: '#555' }}>
              チャットを新規作成
            </Typography>
            <IconButton
              aria-label="新しいチャット"
              size="small"
              sx={{ ml: 1, bgcolor: '#e3f2fd', color: '#1976d2', '&:hover': { bgcolor: '#bbdefb' } }}
              onClick={() => {
                setMessages([]);
                setSelectedHistory(null);
              }}
            >
              <AddIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 1 }} />
          {/* 最近ラベル */}
          <Typography variant="caption" sx={{ color: '#888', pl: 2, mb: 0.5 }}>
            最近
          </Typography>
          {/* 履歴リスト */}
          <List sx={{ mb: 2 }}>
            {history.length === 0 && (
              <ListItem><ListItemText primary="履歴はありません" /></ListItem>
            )}
            {history.map((h, idx) => (
              <ListItemButton
                key={idx}
                selected={selectedHistory === idx}
                onClick={() => handleSelectHistory(idx)}
                sx={{ borderRadius: 2, mx: 1, my: 0.5, pl: 2 }}
              >
                <ListItemText
                  primary={h.question.length > 22 ? h.question.slice(0, 22) + "..." : h.question}
                  secondary={h.messages.find(m => m.role === "ai")?.text.slice(0, 28) + "..."}
                  primaryTypographyProps={{ fontSize: 15, color: '#222' }}
                  secondaryTypographyProps={{ fontSize: 12, color: '#888' }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
      {/* メインチャットエリア（常に画面いっぱい） */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100vw', transition: 'margin-left 0.3s', ml: sidebarOpen ? 0 : 0 }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: "bold", mb: 4, mt: 4, width: '100%' }}>
          RAG型チャットAI
        </Typography>
        <Paper elevation={3} sx={{ width: '100%', maxWidth: 900, minHeight: 500, maxHeight: 650, overflow: "auto", mb: 3, p: 3, borderRadius: 4, flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* ChatGPT風ウェルカムメッセージ */}
          {messages.length === 0 && !loading && (
            <Box sx={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 1,
              pointerEvents: 'none',
            }}>
              <Typography variant="h5" sx={{ color: '#888', fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
                何でも聞いてください
              </Typography>
              <Typography variant="body1" sx={{ color: '#aaa', textAlign: 'center' }}>
                保育・ICT・教育・PDF文書の内容など、気軽にご質問ください。
              </Typography>
            </Box>
          )}
          <List>
            {messages.map((msg, idx) => (
              <ListItem key={idx} sx={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }} disableGutters>
                <Stack direction={msg.role === "user" ? "row-reverse" : "row"} alignItems="flex-end" spacing={2} sx={{ width: "100%", maxWidth: 700 }}>
                  <Avatar sx={{ bgcolor: msg.role === "user" ? "primary.main" : "secondary.main" }}>
                    {msg.role === "user" ? <PersonIcon /> : <SmartToyIcon />}
                  </Avatar>
                  <Box
                    className="message-box"
                    sx={{
                      bgcolor: msg.role === "user" ? "primary.light" : "#fff",
                      color: "text.primary",
                      px: 2.5,
                      py: 1.5,
                      borderRadius: 3,
                      boxShadow: 1,
                      width: "100%",
                      maxWidth: "600px",
                      minWidth: "200px",
                      wordBreak: "break-all",
                      overflowWrap: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <Typography
                      variant="body1"
                      className="chat-message long-text"
                      sx={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        overflowWrap: "break-word",
                        width: "100%",
                        lineHeight: 1.6,
                        fontSize: "16px",
                      }}
                    >
                      {msg.text}
                    </Typography>
                  </Box>
                </Stack>
              </ListItem>
            ))}
            {loading && (
              <ListItem sx={{ justifyContent: "flex-start" }} disableGutters>
                <Stack direction="row" alignItems="flex-end" spacing={2} sx={{ width: "100%", maxWidth: 700 }}>
                  <Avatar sx={{ bgcolor: "secondary.main" }}>
                    <SmartToyIcon />
                  </Avatar>
                  <Box
                    className="message-box"
                    sx={{
                      bgcolor: "#fff",
                      color: "text.primary",
                      px: 2.5,
                      py: 1.5,
                      borderRadius: 3,
                      boxShadow: 1,
                      width: "100%",
                      maxWidth: "600px",
                      minWidth: "200px",
                      wordBreak: "break-all",
                      overflowWrap: "break-word",
                      whiteSpace: "pre-wrap",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    <Typography variant="body1" sx={{ flex: 1 }}>AIが考え中...</Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<StopIcon />}
                      onClick={handleStop}
                      sx={{ ml: 2, minWidth: 40, height: 36 }}
                    >
                      Stop
                    </Button>
                  </Box>
                </Stack>
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        </Paper>
        <Box display="flex" gap={2} alignItems="center" sx={{ mt: 2, width: '100%', maxWidth: 900 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="質問を入力してください"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{
              bgcolor: "#fff",
              borderRadius: 2,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              overflowWrap: "break-word",
            }}
            multiline
            minRows={1}
            inputProps={{
              style: {
                fontSize: 18,
                padding: "16px 12px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                overflowWrap: "break-word",
              },
            }}
            disabled={loading}
          />
          <Button variant="contained" onClick={handleSend} sx={{ minWidth: 120, height: 56, fontSize: 18 }} disabled={loading}>
            送信
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
