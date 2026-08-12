# PDF Integrity & Provenance - TODO

- [x] Phase 1: Réviser le périmètre et inventorier l’état restauré
- [x] Phase 2: Réparer le backend et les fonctions de clonage de signatures
- [x] Phase 3: Implémenter l'analyse et la reconstruction via qpdf et exiftool
- [x] Phase 4: Finaliser l’interface blueprint avec gestion de profils
- [x] Phase 5: Vérifier le build, sauvegarder le checkpoint et livrer le projet
- [x] Phase additionnelle: Intégrer le comparateur visuel côte à côte avant/après
- [x] Remplacer `/api/upload` par une procédure tRPC S3 avec URL signée de traitement
- [x] Retourner et enregistrer les snapshots `metadataBefore` et `metadataAfter`
- [x] Ajouter des tests Vitest pour les différences de métadonnées
- [x] Phase additionnelle: Exporter le rapport de comparaison en JSON et CSV
- [x] Amélioration: Filtres par statut et recherche textuelle dans le comparateur
- [x] Amélioration: Partage de rapport de comparaison (stockage S3 et lien temporaire)
- [x] Amélioration: Sélecteur de durée de validité (1h, 24h, 7j) pour les liens de partage
- [x] Amélioration: Mode d’affichage compact masquant les champs identiques et mettant en avant les différences
- [x] Bugfix: Installer et rendre accessible `exiftool` pour le module Python `pdf_analyzer.py`
- [x] Tâche: Push professionnel sur le dépôt GitHub `eulogep/clone-pdf-signature-`
