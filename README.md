# 💕 Couple Chat App

A charming and feature-rich chat application designed specifically for couples to share their precious moments, conversations, and memories in a delightfully themed interface.

## ✨ Features

### 🎨 Cute Couples Theme
- Adorable and romantic UI design tailored for couples
- Lovely color schemes and heart-warming visual elements
- Intuitive interface that feels personal and intimate

### 📊 CSV Upload & Chat Analytics
- **CSV Upload**: Easily import your existing chat conversations from other platforms
- **Chat Analytics**: Gain insights into your conversation patterns, frequency, and favorite topics
- **Memory Timeline**: Visualize your chat history and relationship milestones
- **Word Cloud**: See your most frequently used words and phrases together

### 🌐 Multi-Language Support
- **Tanglish Support**: Seamless handling of Tamil-English mixed conversations
- **Full English Support**: Complete English language compatibility
- Smart language detection and processing

### 🤖 AI-Powered Features
- **Gemini 2.5 Flash LLM Integration**: Advanced AI assistance for enhanced conversations
- Smart conversation suggestions and responses
- Context-aware chat recommendations
- Relationship insights and conversation starters

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16.0.0 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/suhas-24/couple-chat-app.git
   cd couple-chat-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables in your `.env` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   DATABASE_URL=your_database_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:3000` to see the application running.

### 📁 Project Structure

```
couple-chat-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Application pages
│   ├── services/           # API services and integrations
│   ├── utils/              # Utility functions
│   ├── styles/             # CSS and styling files
│   └── hooks/              # Custom React hooks
├── public/                 # Static assets
├── docs/                   # Documentation
├── tests/                  # Test files
└── config/                 # Configuration files
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📱 Usage

1. **Create Your Profile**: Set up your couple's profile with photos and preferences
2. **Upload Chat History**: Use the CSV upload feature to import existing conversations
3. **Start Chatting**: Begin your conversation with AI assistance and smart suggestions
4. **Explore Analytics**: View your chat patterns and relationship insights
5. **Enjoy the Experience**: Share memories, plan dates, and strengthen your bond

## 🔐 Privacy & Security

Your privacy is our priority:
- All conversations are encrypted end-to-end
- Data is stored securely with industry-standard practices
- No third-party access to your personal conversations
- Option to delete all data at any time

## 🛠️ Tech Stack

- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB/PostgreSQL
- **AI Integration**: Google Gemini 2.5 Flash API
- **Authentication**: JWT
- **File Processing**: Multer, CSV Parser

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Contact: [your-email@example.com]
- Join our community discussions

## 🌟 Acknowledgments

- Thanks to all couples who inspired this project
- Google Gemini team for the amazing AI capabilities
- The open-source community for the wonderful tools and libraries

---

💝 **Made with love for couples everywhere** 💝

*Created with Comet Assistant*
