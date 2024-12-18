import React, { useState, useEffect } from 'react';
import UploadOrdonnance from './components/UploadOrdonnance';

function App() {
  const [medicaments, setMedicaments] = useState([]);

  const handleMedicamentsExtracted = (newMedicaments) => {
    setMedicaments(newMedicaments);
  };

  const fetchMedicaments = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/ordonnance/medicaments", {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json(); // on attend la réponse en json
      console.log("Fetched medicaments:", data); 
      setMedicaments(data);
    } catch (error) {
      console.error("Failed to fetch medicaments:", error);
      // setMedicaments([]); 
    }
  };

  useEffect(() => {
    fetchMedicaments();
  }, []);

  return (
    <div>
      <h1>Gestion des Médicaments</h1>
      <UploadOrdonnance onMedicamentsExtracted={handleMedicamentsExtracted} />
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '20px' }}>
        {(medicaments || []).map((medicament, index) => (
          <div key={index} id={medicament.id} style={{
            border: '1px solid #ddd',
            borderRadius: '5px',
            padding: '10px',
            margin: '10px',
            width: '200px',
          }}>
            <h3>{medicament.nom}</h3>
            <p><strong>Dosage:</strong> {medicament.dosage}</p>
            <p><strong>Instructions:</strong> {medicament.instructions}</p>
            <p>Stock : {medicament.stock}</p>
            <p>{medicament.prix} € unité</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
