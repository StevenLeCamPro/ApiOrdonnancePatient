import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import Tesseract from 'tesseract.js';
import axios from 'axios';

// Charger le worker pour pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

export const handleValidateCommande = async (commandeId) => {
    try {
        await axios.post(`/api/commande/validate/${commandeId}`);
        console.log('Commande validée avec succès. Stock mis à jour.');
    } catch (err) {
        console.error('Erreur lors de la validation de la commande.', err);
    }
};

export const handleDeleteCommande = async (commandeId) => {
    try {
        await axios.delete(`/api/commande/delete/${commandeId}`);
        console.log('Commande supprimée avec succès.');
    } catch (err) {
        console.error('Erreur lors de la suppression de la commande.', err);
    }
};

function CommandeUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [commandeId, setCommandeId] = useState(null);
    const [medicaments, setMedicaments] = useState([]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleFileUpload = async (event) => {
        event.preventDefault(); // Empêche le rechargement de la page
        if (!file) return;

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const fileReader = new FileReader();
            fileReader.onload = async () => {
                const pdfData = new Uint8Array(fileReader.result);
                const pdf = await pdfjsLib.getDocument(pdfData).promise;

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
                        logger: (m) => console.log(m),
                    });

                    const extractedText = result.data.text;
                    const normalizedText = extractedText.normalize('NFC');
                    extractedTexts.push(normalizedText);
                }

                const fullText = extractedTexts.join('\n');
                console.log('Texte extrait complet :', fullText);

                const response = await axios.post('api/commande/create', { text: fullText });
                setMedicaments(response.data.medicaments);
                setCommandeId(response.data.commandeId);
                setSuccessMessage('Demande traitée avec succès.');
            };
    
            fileReader.readAsArrayBuffer(file);
        } catch (err) {
            console.error('Erreur:', err);
            setError('Une erreur est survenue lors de l’envoi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Uploader une ordonnance</h2>
            <form onSubmit={handleFileUpload}>
                <input type="file" accept=".pdf" onChange={handleFileChange} />
                <button type="submit">Envoyer le fichier</button>
            </form>

            {loading && <p style={{ color: 'blue' }}>Demande en cours...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

            {commandeId && (
                   <div>
                   <h3>Commande ID: {commandeId}</h3>
                   <ul>
                       {medicaments.map((med, index) => (
                           <li key={index}>
                               {med.nom} ({med.dosage}) - Quantité : {med.quantite} - Prix unitaire : {med.prix_unitaire} €
                           </li>
                       ))}
                   </ul>
                   <h4>Prix total : {response.data.prix_total} €</h4> {/* Afficher le prix total */}
               </div>
            )}
        </div>
    );
}

export default CommandeUpload;
