# 🏡 Étage Card

> Custom card HACS pour Home Assistant — Tableau de bord tout-en-un

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![HACS](https://img.shields.io/badge/HACS-Custom-orange)

---

## ✨ Fonctionnalités

| Onglet | Entités | Description |
|--------|---------|-------------|
| 🌡️ Températures | 6 capteurs | Affichage valeur + barre de gradient colorée (bleu→rouge) |
| 🪟 Fenêtres | 6 capteurs | Icône SVG ouverte/fermée + état en temps réel |
| 🔌 Prises | 12 switchs | Toggle ON/OFF + affichage puissance (W) si disponible |
| 💡 Lumières | 7 switchs | Toggle avec animation + icône ampoule animée |
| 🏠 Volets | 6 covers | Slider de position + boutons ▲ ■ ▼ + visuel lamelles |
| 🔥 Sécurité | 1 détecteur | Affichage grande alerte visuelle avec animation |

---

## 📦 Installation

### Via HACS (recommandé)

1. Dans HACS → **Intégrations personnalisées** → `+ Dépôt personnalisé`
2. URL : `https://github.com/ton-user/etage-card`
3. Catégorie : **Lovelace**
4. Cliquer sur **Installer**

### Manuellement

```bash
# Copier le fichier dans Home Assistant
cp etage-card.js /config/www/etage-card.js
```

Ajouter dans `configuration.yaml` :
```yaml
lovelace:
  resources:
    - url: /local/etage-card.js
      type: module
```

---

## ⚙️ Configuration

Ajouter la carte dans Lovelace :

```yaml
type: custom:etage-card

# 🌡️ Capteurs de température (6)
temperatures:
  - sensor.temperature_salon
  - sensor.temperature_chambre1
  - sensor.temperature_chambre2
  - sensor.temperature_cuisine
  - sensor.temperature_bureau
  - sensor.temperature_garage
temperatures_names:
  - Salon
  - Chambre 1
  - Chambre 2
  - Cuisine
  - Bureau
  - Garage

# 🪟 Fenêtres (6)
fenetres:
  - binary_sensor.fenetre_salon
  - binary_sensor.fenetre_chambre1
  - binary_sensor.fenetre_chambre2
  - binary_sensor.fenetre_cuisine
  - binary_sensor.fenetre_bureau
  - binary_sensor.fenetre_sdb
fenetres_names:
  - Salon
  - Chambre 1
  - Chambre 2
  - Cuisine
  - Bureau
  - Salle de bain

# 🔌 Prises électriques (12)
prises:
  - switch.prise_tv
  - switch.prise_pc
  - switch.prise_lampe_salon
  - switch.prise_cafetiere
  - switch.prise_grille_pain
  - switch.prise_micro_onde
  - switch.prise_lave_vaisselle
  - switch.prise_machine_laver
  - switch.prise_seche_linge
  - switch.prise_chambre1
  - switch.prise_chambre2
  - switch.prise_garage
prises_names:
  - TV
  - PC
  - Lampe Salon
  - Cafetière
  - Grille-pain
  - Micro-onde
  - Lave-vaisselle
  - Machine à laver
  - Sèche-linge
  - Chambre 1
  - Chambre 2
  - Garage

# 💡 Interrupteurs / Lumières (7)
interrupteurs:
  - switch.lumiere_entree
  - switch.lumiere_salon
  - switch.lumiere_cuisine
  - switch.lumiere_chambre1
  - switch.lumiere_chambre2
  - switch.lumiere_sdb
  - switch.lumiere_garage
interrupteurs_names:
  - Entrée
  - Salon
  - Cuisine
  - Chambre 1
  - Chambre 2
  - Salle de bain
  - Garage

# 🏠 Volets (6)
volets:
  - cover.volet_salon
  - cover.volet_chambre1
  - cover.volet_chambre2
  - cover.volet_cuisine
  - cover.volet_bureau
  - cover.volet_garage
volets_names:
  - Salon
  - Chambre 1
  - Chambre 2
  - Cuisine
  - Bureau
  - Garage

# 🔥 Détecteur de fumée (1)
fumee:
  - binary_sensor.detecteur_fumee_cuisine
fumee_names:
  - Cuisine
```

---

## 🎨 Éditeur visuel

La carte inclut un éditeur visuel intégré dans l'interface Lovelace.
Cliquer sur **✏️ Modifier** dans le menu de la carte pour accéder à la configuration sans éditer le YAML.

---

## 🎨 Design

- Thème sombre **Dark Navy** avec accents colorés par catégorie
- Températures : gradient bleu→vert→orange→rouge selon la valeur
- Fenêtres : icônes SVG animées
- Volets : visuel lamelles proportionnel au pourcentage d'ouverture
- Détecteur fumée : animation pulsante en cas d'alarme
- Hauteur fixe **500px** avec scroll par onglet

---

## 📄 Licence

MIT — Libre d'utilisation et de modification
