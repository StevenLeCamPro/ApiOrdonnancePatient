import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import Tesseract from 'tesseract.js';
import axios from 'axios';

// Charger le worker pour pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

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
        event.preventDefault();
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
    
                    await page.render({ canvasContext: context, viewport }).promise;
                    const imageData = canvas.toDataURL('image/png');
    
                    const result = await Tesseract.recognize(imageData, 'fra', {
                        logger: (m) => console.log(m),
                    });
    
                    extractedTexts.push(result.data.text.normalize('NFC'));
                }
    
                const fullText = extractedTexts.join('\n');
                console.log('Texte extrait complet :', fullText);
    
                const response = await axios.post('/api/commande/create', { text: fullText });
                if (response.status === 200) {
                    setCommandeId(response.data.commande_id);
                    setMedicaments(response.data.medicaments);
                    setSuccessMessage('Commande créée avec succès.');
                } else {
                    setError('Erreur côté serveur.');
                }
            };
    
            fileReader.readAsArrayBuffer(file);
        } catch (err) {
            console.error('Erreur:', err);
            setError('Une erreur est survenue lors de l’envoi.');
        } finally {
            setLoading(false);
        }
    };

    // const handleValidateCommande = async () => {
    //     try {
    //         await axios.post(`/api/commande/validate/${commandeId}`);
    //         setSuccessMessage('Commande validée avec succès. Stock mis à jour.');
    //     } catch (err) {
    //         setError('Erreur lors de la validation de la commande.');
    //         console.error(err);
    //     }
    // };

    // const handleDeleteCommande = async () => {
    //     try {
    //         await axios.delete(`/api/commande/delete/${commandeId}`);
    //         setSuccessMessage('Commande supprimée avec succès.');
    //         setCommandeId(null);
    //         setMedicaments([]);
    //     } catch (err) {
    //         setError('Erreur lors de la suppression de la commande.');
    //         console.error(err);
    //     }
    // };

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
                                {med.nom} ({med.dosage}) - Quantité : {med.quantite}
                            </li>
                        ))}
                    </ul>
                    <button onClick={handleValidateCommande}>Valider la commande</button>
                    <button onClick={handleDeleteCommande}>Supprimer la commande</button>
                </div>
            )}
        </div>
    );
}

export default CommandeUpload;
