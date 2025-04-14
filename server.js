import app from './app.js';
import './Config/Db.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});