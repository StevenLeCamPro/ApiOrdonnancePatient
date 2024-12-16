<?php
namespace App\Controller;

use App\Entity\Medicament;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/ordonnance')]
class OrdonnanceController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em) {}

    #[Route('/process', methods: ['POST'])]
    public function processOrdonnance(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $text = $data['text'] ?? '';

        // Exemple simple : Extraction basée sur des mots-clés
        $lines = explode("\n", $text);
        $medicaments = [];
        $erreurs = [];

        // Convertir chaque ligne en UTF-8
        foreach ($lines as &$line) {
            $line = mb_convert_encoding($line, 'UTF-8', 'auto');
        }

        foreach ($lines as $line) {
            if (preg_match('/^([\p{L}\p{M}\'\s\-]+)\s+\(([\d\.]+(?:mg|g|ml|mI|Ul|µg))\):\s+(.*)\s+\[Stock:\s*(\d+)\]\s+\[Prix:\s*([\d\.]+)\]$/iu', $line, $matches)) {
                $nom = trim($matches[1]);
                $dosage = trim($matches[2]);
                $instructions = trim($matches[3]);
                $stockAjoute = (int)$matches[4];
                $prix = (float)$matches[5];

                $medicament = $this->em->getRepository(Medicament::class)->findOneBy([
                    'nom' => $nom,
                    'dosage' => $dosage
                ]);

                if (!$medicament) {
                    $medicament = new Medicament();
                    $medicament->setNom($nom);
                    $medicament->setDosage($dosage);
                    $medicament->setInstructions($instructions);
                    $medicament->setStock($stockAjoute);
                    $medicament->setPrix($prix);
                    $this->em->persist($medicament);
                } else {
                    $medicament->setStock($medicament->getStock() + $stockAjoute);

                    if ($medicament->getPrix() === null || $medicament->getPrix() === 0.0) {
                        $medicament->setPrix($prix);
                    }
                }

                // Ajouter à la liste des résultats
                $medicaments[] = [
                    'nom' => $medicament->getNom(),
                    'dosage' => $medicament->getDosage(),
                    'instructions' => $medicament->getInstructions(),
                    'stock' => $medicament->getStock(),
                    'prix' => $medicament->getPrix(),
                ];
            } else {
                $erreurs[] = $line; // Stocker les lignes non reconnues
            }
        }

        // Sauvegarder uniquement les nouveaux médicaments
        $this->em->flush();

        // Retourner la réponse
        return new JsonResponse(['medicaments' => $medicaments, 'erreurs' => $erreurs]);
    }

    #[Route('/medicaments', methods: ['GET'])]
    public function getMedicaments(): JsonResponse
    {
        $medicaments = $this->em->getRepository(Medicament::class)->findAll();
        $data = [];
        foreach ($medicaments as $medicament) {
            $stock = $medicament->getStock() < 10 ? 'Insuffisant' : $medicament->getStock();
            $data[] = [
                'nom' => $medicament->getNom(),
                'dosage' => $medicament->getDosage(),
                'instructions' => $medicament->getInstructions(),
                'stock' => $stock,
                'prix' => $medicament->getPrix(),
            ];
        }
        return new JsonResponse($data);
    }
}
