# Daily Life Planner

A modern, AI-powered daily life planner with intelligent scheduling and conflict detection.

## Features

- **Smart Task Management**: Add, edit, and delete tasks with different frequencies
- **Conflict Detection**: Prevents scheduling conflicts with real-time warnings
- **Flexible Scheduling**: Daily, weekly, and one-time tasks with custom frequencies
- **Authentication**: Secure user login and registration system
- **Modern UI**: Beautiful, responsive design with dark/light mode support

## Task Types

- **Daily Tasks**: Repeating tasks with custom frequencies (every day, weekdays, weekends, specific days)
- **Once Tasks**: One-time appointments or events with specific dates and times
- **Flexible Tasks**: AI-suggested tasks that can be scheduled anytime

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd daily-life-planner
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/            # Reusable UI components
│   ├── AddTaskDialog.tsx
│   ├── EditTaskDialog.tsx
│   ├── TaskCard.tsx
│   └── DailySchedule.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
│   └── conflictDetection.ts
├── pages/             # Page components
└── App.tsx           # Main app component
```

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui
- **Authentication**: JWT tokens
- **Backend**: Node.js, Express, MongoDB
- **Styling**: CSS Modules, Tailwind CSS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
