require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ai', require('./routes/ai'));

// Socket.io for live chat
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");
const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });

  socket.on('send_message', async (data) => {
    // Send user message to room
    io.to(data.room).emit('receive_message', data);

    // If message is not from bot, generate AI reply
    if (data.author !== 'Salon AI') {
      try {
        const prompt = `You are a helpful, fast, and polite AI assistant for a professional salon called Saloon Yehansa. Keep your responses concise, friendly, and related to salon services (haircuts, styling, coloring, makeup, attire rentals, bookings, etc.). 
CRITICAL BUSINESS INFO:
- Opening Hours: Monday to Saturday from 9:00 AM to 8:00 PM. Sunday is CLOSED.
- Location: Tangalle Road, Withrandeniya.
- Phone: 0765547927.
Never provide information that contradicts the above. If someone asks about Sunday, clearly state that the salon is closed.
Customer's message: "${data.message}"`;
        
        const result = await aiModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        const time = new Date();
        const formattedTime = time.getHours() + ':' + time.getMinutes().toString().padStart(2, '0');

        const aiMessage = {
          room: data.room,
          author: 'Salon AI',
          message: text,
          time: formattedTime
        };

        // Emit response immediately without artificial delay
        io.to(data.room).emit('receive_message', aiMessage);

      } catch (error) {
        console.error('AI Reply Error:', error);
        
        const time = new Date();
        const formattedTime = time.getHours() + ':' + time.getMinutes().toString().padStart(2, '0');
        
        // Fallback message if AI fails
        io.to(data.room).emit('receive_message', {
          room: data.room,
          author: 'Salon AI',
          message: "I'm sorry, I'm having trouble connecting to my brain right now. Please call our front desk for assistance!",
          time: formattedTime
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
