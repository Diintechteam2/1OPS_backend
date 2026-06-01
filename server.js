const app = require('./app');
const connectDB = require('./src/config/db');
const { startScheduler } = require('./src/utils/scheduler');

const PORT = process.env.PORT || 5000;

// Establish database connection prior to listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server successfully started on port ${PORT}`);
    startScheduler();
  });
}).catch((error) => {
  console.error('Failed to boot application due to database error:', error.message);
  process.exit(1);
});
