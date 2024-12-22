<?php

namespace App\Controller;

use App\Entity\Commande;
use App\Entity\Medicament;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Psr\Log\LoggerInterface;

#[Route('/api/commande')]
class CommandeController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em, private LoggerInterface $logger) {}

    // Route pour créer une commande à partir du texte de l'ordonnance
    #[Route('/create', methods: ['POST'])]
    public function createCommande(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!$data || empty($data['text'])) {
                throw new \Exception('Le champ "text" est manquant ou vide.');
            }

            $this->logger->info('Données reçues : ', ['data' => $data]);

            $lines = explode("\n", $data['text']);
            $medicaments = [];
            foreach ($lines as $line) {
                if (preg_match('/^([\p{L}\p{M}\'\s\-]+)\s+\(([\d\.]+(?:mg|g|ml|mI|mL|Ul|µg))\)\s*\[Quantité:\s*(\d+)\]$/iu', $line, $matches)) {
                    $medicaments[] = [
                        'nom' => trim($matches[1]),
                        'dosage' => trim($matches[2]),
                        'quantite' => (int) $matches[3],
                    ];
                } else {
                    $this->logger->error('Ligne non reconnue : ' . $line);
                }
            }

            if (empty($medicaments)) {
                throw new \Exception('Aucun médicament valide trouvé.');
            }

            $commande = new Commande();
            $commande->setPatientName('Patient inconnu');
            $commande->setCreatedAt(new \DateTimeImmutable());

            // Pas de modification de stock ici, juste la préparation de la commande
            $quantitesMeds = []; // Tableau pour stocker les quantités des médicaments

            foreach ($medicaments as $med) {
                // Trouver le médicament dans la base de données par son nom et son dosage
                $medicament = $this->em->getRepository(Medicament::class)->findOneBy(['nom' => $med['nom'], 'dosage' => $med['dosage']]);

                if ($medicament) {
                    // Ajouter le médicament à la commande
                    $commande->getProducts()->add($medicament);

                    // Ajouter la quantité au tableau
                    $quantitesMeds[$med['nom']] = $med['quantite'];
                } else {
                    throw new \Exception("Médicament non trouvé: {$med['nom']} ({$med['dosage']})");
                }
            }

            // Ajouter les quantités associées à la commande
            $commande->setQuantite($quantitesMeds); // Suppose que vous avez un champ de type JSON ou équivalent

            // Persister la commande sans modifier le stock pour l'instant
            $this->em->persist($commande);
            $this->em->flush();

            return new JsonResponse([
                'commande_id' => $commande->getId(),
                'medicaments' => $medicaments,
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Erreur lors de la création de la commande : ' . $e->getMessage());
            return new JsonResponse(['error' => $e->getMessage()], 500);
        }
    }



    // Route pour récupérer toutes les commandes
    #[Route('/list', methods: ['GET'])]
    public function getCommandes(): JsonResponse
    {
        $commandes = $this->em->getRepository(Commande::class)->findAll();
        $data = [];

        foreach ($commandes as $commande) {
            $data[] = [
                'id' => $commande->getId(),
                'patient' => $commande->getPatientName(),
                'quantites' => $commande->getQuantite(),
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
            'quantites' => $commande->getQuantite(),
            // Ajoutez d'autres informations si nécessaire
        ];

        return new JsonResponse($data);
    }

    // Route pour valider une commande
    #[Route('/validate/{id}', methods: ['POST'])]
    public function validateCommande(int $id): JsonResponse
    {
        try {
            // Trouver la commande par son ID
            $commande = $this->em->getRepository(Commande::class)->find($id);

            if (!$commande) {
                return new JsonResponse(['message' => 'Commande non trouvée.'], 404);
            }

            // Vérifier les stocks et mettre à jour
            $quantitesMeds = $commande->getQuantite();
            foreach ($quantitesMeds as $nomMedicament => $quantite) {
                // Trouver le médicament dans la base de données
                $medicament = $this->em->getRepository(Medicament::class)->findOneBy(['nom' => $nomMedicament]);

                if ($medicament) {
                    // Stock actuel du médicament
                    $stockActuel = $medicament->getStock();

                    // Vérifier si la quantité demandée est disponible en tenant compte du stock de sécurité
                    $stockSecurite = 10;
                    if ($quantite > ($stockActuel - $stockSecurite)) {
                        throw new \Exception("Stock insuffisant pour le médicament: {$nomMedicament}. Disponible: {$stockActuel}, demandé: {$quantite}, stock de sécurité: {$stockSecurite}");
                    }

                    // Réduire le stock du médicament
                    $medicament->setStock($stockActuel - $quantite);
                } else {
                    throw new \Exception("Médicament non trouvé: {$nomMedicament}");
                }
            }

            
            $this->em->persist($commande);
            $this->em->flush();

            $this->em->remove($commande);
            $this->em->flush();

            return new JsonResponse(['message' => 'Commande validée avec succès.']);
        } catch (\Exception $e) {
            $this->logger->error('Erreur lors de la validation de la commande : ' . $e->getMessage());
            return new JsonResponse(['error' => 'Erreur lors de la validation de la commande.'], 500);
        }
    }

    // Route pour supprimer une commande
    #[Route('/delete/{id}', methods: ['DELETE'])]
    public function deleteCommande(int $id): JsonResponse
    {
        try {
            // Trouver la commande par son ID
            $commande = $this->em->getRepository(Commande::class)->find($id);

            if (!$commande) {
                return new JsonResponse(['message' => 'Commande non trouvée.'], 404);
            }

            // Supprimer la commande
            $this->em->remove($commande);
            $this->em->flush();

            return new JsonResponse(['message' => 'Commande supprimée avec succès.']);
        } catch (\Exception $e) {
            $this->logger->error('Erreur lors de la suppression de la commande : ' . $e->getMessage());
            return new JsonResponse(['error' => 'Erreur lors de la suppression de la commande.'], 500);
        }
    }
}
