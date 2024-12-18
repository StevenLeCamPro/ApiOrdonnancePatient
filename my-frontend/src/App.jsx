import React, { useState, useEffect } from 'react';
import UploadOrdonnance from './components/UploadOrdonnance';

function App() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleMedicamentsExtracted = (newMedicaments) => {
    // Cette fonction est appelée lorsqu'un nouvel ordonnance est traitée
    console.log("Medicaments extracted:", newMedicaments);
    // Vous pouvez décider si vous souhaitez faire une requête API pour créer la commande ici.
    // Par exemple :
    // createCommande(newMedicaments);
  };

  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/commande", {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched commandes:", data);
      setCommandes(data);
    } catch (error) {
      console.error("Failed to fetch commandes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCommande = async (commandeId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/commande/validate/${commandeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (response.ok) {
        console.log("Commande validée avec succès.");
        // Recharger les commandes après validation
        fetchCommandes();
      } else {
        console.error("Erreur lors de la validation de la commande");
      }
    } catch (error) {
      console.error("Failed to validate commande:", error);
    }
  };

  const handleDeleteCommande = async (commandeId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/commande/delete/${commandeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        console.log("Commande supprimée avec succès.");
        // Recharger les commandes après suppression
        fetchCommandes();
      } else {
        console.error("Erreur lors de la suppression de la commande");
      }
    } catch (error) {
      console.error("Failed to delete commande:", error);
    }
  };

  useEffect(() => {
    fetchCommandes();
  }, []);

  return (
    <div>
      <h1>Gestion des Commandes</h1>
      <UploadOrdonnance onMedicamentsExtracted={handleMedicamentsExtracted} />
      
      {loading && <p>Chargement des commandes...</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '20px' }}>
        {commandes.length > 0 ? (
          commandes.map((commande) => (
            <div key={commande.id} style={{
              border: '1px solid #ddd',
              borderRadius: '5px',
              padding: '10px',
              margin: '10px',
              width: '300px',
            }}>
              <h3>Commande ID: {commande.id}</h3>
              <h4>Fournisseur: {commande.fournisseur}</h4>

              <h5>Médicaments :</h5>
              <ul>
                {commande.medicaments.map((medicament, index) => (
                  <li key={index}>
                    <strong>{medicament.nom}</strong> ({medicament.dosage}) - Quantité: {medicament.quantite}
                  </li>
                ))}
              </ul>

              <button onClick={() => handleValidateCommande(commande.id)}>
                Valider la commande
              </button>
              <button onClick={() => handleDeleteCommande(commande.id)}>
                Supprimer la commande
              </button>
            </div>
          ))
        ) : (
          <p>Aucune commande trouvée.</p>
        )}
      </div>
    </div>
  );
}

export default App;
