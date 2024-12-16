import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import Tesseract from 'tesseract.js';
import axios from 'axios';

// Charger le worker dans un fichier statique à cause de la version
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

function UploadOrdonnance({ onMedicamentsExtracted }) {
    const [loading, setLoading] = useState(false); // État pour le loader
    const [error, setError] = useState(null); // État pour les erreurs
    const [file, setFile] = useState(); // État pour le fichier sélectionné
    const [successMessage, setSuccessMessage] = useState(null); // Message de succès

    const handleFileChange = (e) => {
        setFile(e.target.files[0]); // Met à jour le fichier sélectionné
    };

    const handleFileUpload = async (event) => {
        event.preventDefault(); // Empêche le rechargement de la page

        if (!file) return; // Si aucun fichier n'est sélectionné, on quitte

        setLoading(true); // Active le loader immédiatement
        setError(null); // Réinitialise les erreurs
        setSuccessMessage(null); // Réinitialise le message de succès

        try {
            const fileReader = new FileReader();
            fileReader.onload = async () => {
                const pdfData = new Uint8Array(fileReader.result);
                const pdf = await pdfjsLib.getDocument(pdfData).promise;

                console.log(`PDF chargé avec ${pdf.numPages} pages.`);

                const extractedTexts = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2 });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };
                    await page.render(renderContext).promise;

                    const imageData = canvas.toDataURL('image/png');
                    console.log(`Analyse de la page ${i} en cours...`);

                    const result = await Tesseract.recognize(imageData, 'fra', {
                        logger: (m) => console.log(m), // Affiche les logs de Tesseract
                    });

                    // Nettoyage et normalisation du texte extrait
                    const extractedText = result.data.text;
                    const normalizedText = extractedText.normalize('NFC'); // Normalisation Unicode pour accents
                    extractedTexts.push(normalizedText);
                }

                const fullText = extractedTexts.join('\n');
                console.log('Texte extrait complet :', fullText);

                // Envoi à l'API Symfony
                const response = await axios.post('/api/ordonnance/process', { text: fullText });
                onMedicamentsExtracted(response.data.medicaments);

                setSuccessMessage('Demande traitée avec succès.');
            };

            fileReader.readAsArrayBuffer(file);
        } catch (err) {
            setError('Erreur lors du traitement du fichier PDF.');
            console.error(err);
        } finally {
            setLoading(false); // Arrêter le loader une fois terminé
        }
    };

    return (
        <div>
            <h2>Uploader une ordonnance</h2>
            <form onSubmit={handleFileUpload}>
                <input type="file" accept=".pdf" onChange={handleFileChange} />
                <button type="submit">Envoyer le fichier</button>
            </form>
            {/* Affiche le message "Demande en cours..." si loading est vrai */}
            {loading && <p style={{ color: 'blue' }}>Demande en cours...</p>}
            {/* Affiche un message d'erreur s'il y a une erreur */}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {/* Affiche un message de succès si le traitement est terminé */}
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        </div>
    );
}

export default UploadOrdonnance;
