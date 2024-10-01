const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Ensure the public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Endpoint to fetch song MP3
app.get('/api/song', async (req, res) => {
  const searchQuery = req.query.song; // Expecting query parameter like /api/song?song=faded

  if (!searchQuery) {
    return res.status(400).json({ message: 'Please provide a song name to search.' });
  }

  const apiUrl = `https://deku-rest-api.gleeze.com/search/spotify?q=${encodeURIComponent(searchQuery)}`;

  try {
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data && data.result && data.result.length > 0) {
      const firstResult = data.result[0];
      const trackUrl = firstResult.url;

      const downloadUrl = `https://deku-rest-api.gleeze.com/api/spotify2?q=${encodeURIComponent(trackUrl)}`;
      const downloadResponse = await axios.get(downloadUrl);
      const downloadData = downloadResponse.data;

      if (downloadData && downloadData.result && downloadData.result.download_url) {
        const mp3Url = downloadData.result.download_url;

        // File path for storing the downloaded MP3
        const filePath = path.join(publicDir, `${firstResult.title}.mp3`);

        // Download and save the MP3 file
        const writer = fs.createWriteStream(filePath);
        const mp3Stream = await axios({
          url: mp3Url,
          method: 'GET',
          responseType: 'stream'
        });

        mp3Stream.data.pipe(writer);

        writer.on('finish', () => {
          const audioMessage = {
            message: `Here is your song: ${firstResult.title}`,
            url: `https://hey4.onrender.com/public/${firstResult.title}.mp3`, // Your hosting URL
          };
          res.status(200).json(audioMessage);
        });

        writer.on('error', (err) => {
          console.error('Error saving the MP3:', err.message);
          res.status(500).json({ message: 'Error saving the MP3 file.' });
        });

      } else {
        res.status(404).json({ message: 'Failed to fetch the download URL for the track.' });
      }
    } else {
      res.status(404).json({ message: `No tracks found for "${searchQuery}".` });
    }

  } catch (error) {
    console.error('Error fetching Spotify track:', error.message);
    res.status(500).json({ message: 'Sorry, there was an error processing your request.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
