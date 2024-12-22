import React, { useState, useEffect } from 'react';
import UploadOrdonnance from './components/UploadOrdonnance';
import CommandeUpload from './components/CommandeUpload';
import { handleValidateCommande, handleDeleteCommande } from './components/CommandeUpload';




function App() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/commande/list`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCommandes(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes :", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMedicamentsExtracted = (newMedicaments) => {
    console.log("Médicaments extraits :", newMedicaments);
    // Implémenter la logique de gestion des médicaments si nécessaire
  };

  useEffect(() => {
    fetchCommandes();
  }, []);

  return (
    <div>
      <h1>Gestion des Commandes</h1>
      
      {/* Bouton pour afficher l'interface d'upload d'ordonnance */}
      <button onClick={() => document.getElementById('upload-ordonnance').scrollIntoView({ behavior: 'smooth' })}>
        Télécharger une ordonnance
      </button>
      
      {/* Bouton pour afficher l'interface de commande */}
      <button onClick={() => document.getElementById('commande-upload').scrollIntoView({ behavior: 'smooth' })}>
        Gérer les commandes
      </button>

      {/* Section Upload Ordonnance */}
      <div id="upload-ordonnance" style={{ marginTop: '20px' }}>
        <UploadOrdonnance onMedicamentsExtracted={handleMedicamentsExtracted}/>
      </div>

      {/* Section Commande Upload */}
      <div id="commande-upload" style={{ marginTop: '20px' }}>
        <CommandeUpload  />
      </div>

      {/* Liste des commandes */}
      {loading ? (
        <p>Chargement des commandes...</p>
      ) : (
        <div style={{ marginTop: '20px' }}>
  {commandes && commandes.length > 0 ? (
    commandes.map((commande) => (
      <div
        key={commande.id}
        style={{
          border: '1px solid #ddd',
          borderRadius: '5px',
          padding: '10px',
          margin: '10px',
          width: '300px',
        }}
      >
        <h3>Commande ID: {commande.id}</h3>
        <h5>Médicaments :</h5>
        <ul>
          {Array.isArray(commande.medicament) && commande.medicament.length > 0 ? (
            commande.medicament.map((medicament, index) => (
              <li key={index}>
                 - Quantité: {medicament.quantite}
              </li>
            ))
          ) : (
            <li>Aucun médicament trouvé pour cette commande.</li>
          )}
        </ul>
        <button onClick={() => handleValidateCommande(commande.id)}>Valider</button>
        <button onClick={() => handleDeleteCommande(commande.id)}>Supprimer</button>
      </div>
    ))
  ) : (
    <p>Aucune commande trouvée.</p>
  )}
</div>

      )}
    </div>
  );
}

export default App;
