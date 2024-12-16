import React from 'react';

function MedicamentCard({ medicament }) {
  const {medicaments, setMedicaments} = useState([]);

  const fetchMedicaments = async () => {
    const requestOptions = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }

    const response = await fetch("127.0.0.1:8000/api/medicaments", requestOptions);
      console.log(response)
    setMedicaments(response.data);
  }

  useEffect(() => {
    fetchMedicaments();
  }, []);

  return (

    <div style={{
      border: '1px solid #ddd',
      borderRadius: '5px',
      padding: '10px',
      margin: '10px',
      width: '200px',
    }}>
      <h3>{medicament.nom}</h3>
      <p><strong>Dosage:</strong> {medicament.dosage}</p>
      <p><strong>Instructions:</strong> {medicament.instructions}</p>
    </div>
  );
}

export default MedicamentCard;
