<?php

namespace App\Controller;

use App\Entity\Commande;
use App\Entity\Medicament;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/commande')]
class CommandeController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em) {}

    // Route pour créer une commande à partir du texte de l'ordonnance
    #[Route('/create', methods: ['POST'])]
    public function createCommande(Request $request): JsonResponse
    {
        dd('test');
        $data = json_decode($request->getContent(), true);
        $text = $data['text'] ?? '';
    
        if (empty($text)) {
            return new JsonResponse(['error' => 'Aucun texte reçu.'], 400);
        }
    
        $lines = explode("\n", $text);
        $medicaments = [];
    
        foreach ($lines as $line) {
            if (preg_match('/^([\p{L}\p{M}\'\s\-]+)\s+\(([\d\.]+(?:mg|g|ml|mI|Ul|µg))\)\s*\[Quantité:\s*(\d+)\]$/iu', $line, $matches)) {
                $medicaments[] = [
                    'nom' => trim($matches[1]),
                    'dosage' => trim($matches[2]),
                    'quantite' => (int)$matches[3],
                ];
            }
        }
    
        if (empty($medicaments)) {
            return new JsonResponse(['error' => 'Aucun médicament valide trouvé.'], 400);
        }
    
        $commande = new Commande();
        $commande->setPatientName('Patient inconnu');
        $commande->setCreatedAt(new \DateTimeImmutable());
    
        foreach ($medicaments as $med) {
            $medicamentEntity = new Medicament();
            $medicamentEntity->setNom($med['nom']);
            $medicamentEntity->setDosage($med['dosage']);
            $medicamentEntity->setStock($med['quantite']);
            $medicamentEntity->setCommande($commande);
            $this->em->persist($medicamentEntity);
        }
    
        $this->em->persist($commande);
        $this->em->flush();
    
        return new JsonResponse([
            'commande_id' => $commande->getId(),
            'medicaments' => $medicaments,
        ]);
    }

    // Route pour récupérer toutes les commandes
    #[Route('/', methods: ['GET'])]
    public function getCommandes(): JsonResponse
    {
        $commandes = $this->em->getRepository(Commande::class)->findAll();
        $data = [];

        foreach ($commandes as $commande) {
            $data[] = [
                'id' => $commande->getId(),
                'quantites' => $commande->getQuantites(),
                // Ajoutez ici d'autres informations si nécessaire
            ];
        }

        return new JsonResponse($data);
    }

    // Route pour récupérer une commande spécifique
    #[Route('/{id}', methods: ['GET'])]
    public function getCommande(int $id): JsonResponse
    {
        $commande = $this->em->getRepository(Commande::class)->find($id);

        if (!$commande) {
            return new JsonResponse(['message' => 'Commande non trouvée'], 404);
        }

        $data = [
            'id' => $commande->getId(),
            'quantites' => $commande->getQuantites(),
            // Ajoutez d'autres informations si nécessaire
        ];

        return new JsonResponse($data);
    }
}
