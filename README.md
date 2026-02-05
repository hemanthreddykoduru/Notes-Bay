# NotesBay

NotesBay is a premium note-sharing platform that connects students, allowing them to buy and sell high-quality study materials. It simplifies the academic journey by providing a centralized marketplace for verified notes.

## 🚀 Features

-   **User Authentication**: Secure login and signup powered by Supabase.
-   **Note Marketplace**: Browse, buy, and sell notes with ease.
-   **Subscription Model**: 
    -   **Free Trial**: 2-hour access to all premium features.
    -   **Pro Pass**: Yearly subscription for unlimited access.
-   **Payments**: Integrated Razorpay for secure transactions.
-   **Responsive Design**: Optimized for mobile, tablet, and desktop.
-   **Admin Dashboard**: Manage users, notes, and platform settings.
-   **Interactive UI**: Smooth animations, skeleton loaders, and modern aesthetics.

## 🛠️ Tech Stack

### Frontend
-   **React**: UI Library
-   **Vite**: Build Tool
-   **Tailwind CSS**: Styling
-   **Framer Motion**: Animations
-   **Lucide React**: Icons
-   **React Router**: Navigation
-   **Zustand/Context**: State Management

### Backend
-   **Node.js**: Runtime
-   **Express**: Web Framework
-   **Supabase**: Database & Auth
-   **Razorpay**: Payment Gateway
-   **Google Gemini API**: Artificial Intelligence features

## 📂 Project Structure

```
NotesBay/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Application route pages
│   │   ├── lib/        # Utilities (API, Supabase client)
│   │   └── context/    # Global context providers
│   └── public/         # Static assets
│
└── backend/            # Express backend server
    ├── routes/         # API route handlers
    ├── config/         # Configuration files
    └── middleware/     # Custom middleware (auth, etc.)
```

## 🏁 Getting Started

### Prerequisites
-   Node.js (v18+ recommended)
-   npm or yarn
-   Supabase project
-   Razorpay account

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/hemanthreddykoduru/Notes-Bay.git
    cd Notes-Bay
    ```

2.  **Setup Backend**
    ```bash
    cd backend
    npm install
    cp .env.example .env # Configure your environment variables
    npm run dev
    ```

3.  **Setup Frontend**
    ```bash
    cd ../frontend
    npm install
    cp .env.example .env # Configure your frontend variables
    npm run dev
    ```

4.  **Visit the App**
    Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## 🔑 Environment Variables

### Backend (`.env`)
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
