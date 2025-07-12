# 💡 How to Use AI Features in Couple Chat

Welcome to the **AI-powered** side of Couple Chat!  
Follow this quick guide to unlock relationship insights, conversation starters and more.

---

## 1. One-Time Setup

1. **Get a Gemini API Key**  
   • Visit https://makersuite.google.com/app/apikey → *Create API key*  
   • Copy the key (starts with `AIza`).

2. **Add the Key to the Backend**  
   ```
   backend/.env
   GEMINI_API_KEY=AIza...yourKey...
   ```
   Save, then restart the backend (`npm run dev`).  
   That’s it—AI is now enabled! 🚀

---

## 2. Where AI Appears

| Location | What You’ll See |
|----------|-----------------|
| **Analytics → Overview** | • Relationship Health score (1-10)<br>• Smart statistics |
| **Analytics → Insights tab** | • Positive observations 💕<br>• Communication patterns 📊<br>• Suggestions for growth 🌱 |
| **Floating AI Assistant** (bottom-right ✨) | • Conversation starters 💬<br>• Date ideas 📅<br>• Quick insights ❤️ |

---

## 3. Using the Analytics Dashboard

1. Open any chat, click **📊 Analytics**.  
2. Navigate tabs:  
   • **Activity** ‑ messages & charts  
   • **Words** ‑ word-cloud & emoji stats  
   • **Milestones** ‑ special moments  
   • **Insights** ‑ *AI section*  
3. If AI is active you’ll see detailed lists; otherwise a message reminds you to add the API key.

---

## 4. Chat-Side AI Assistant ✨

1. Inside the chat window, tap the **sparkles button** at bottom-right.  
2. Three tabs appear: **Chat**, **Dates**, **Insights**.  
   | Tab | What it gives |
   |-----|---------------|
   | Chat | 5 ready-to-send conversation starters |
   | Dates | Personalised date ideas with descriptions |
   | Insights | Mini tips & positive notes from AI |
3. Hover / tap a suggestion → **Send icon** → it’s inserted into the chat.  
4. Need fresh ideas? Click **“Try Again”** if available.

---

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| “AI insights unavailable” | Check `GEMINI_API_KEY` exists & backend restarted |
| 400 “API key not valid” | Key typo or not enabled in Google Cloud |
| Slow responses | Free tier rate-limiting—wait a minute or add billing |
| Still stuck | See **AI-SETUP-GUIDE.md** for full checklist |

---

## 6. Privacy & Cost Notes

• Messages are **sent to Google Gemini** only when requesting AI output and are **not stored** by Couple Chat.  
• Each request counts against your Google quota; use the *flash* model for lower cost.

Enjoy smarter, sweeter conversations! 💖
