<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hotel Paradise - Reservas</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f8f6f0 0%, #ffffff 50%, #f5f3ed 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            color: #000;
            margin-bottom: 30px;
            padding: 40px 0;
            background: linear-gradient(135deg, #f4e4bc 0%, #d4af37 50%, #b8860b 100%);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 2px solid #d4af37;
            box-shadow: 0 15px 35px rgba(212, 175, 55, 0.4);
            position: relative;
            overflow: hidden;
        }

        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
            animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
            100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        }

        .header h1 {
            font-size: 3.5em;
            margin-bottom: 10px;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
            color: #000;
            position: relative;
            z-index: 2;
        }

        .header p {
            font-size: 1.3em;
            color: #333;
            font-weight: 500;
            position: relative;
            z-index: 2;
        }

        .nav-tabs {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f6f0 100%);
            border-radius: 15px;
            padding: 10px;
            border: 2px solid #d4af37;
            box-shadow: 0 8px 25px rgba(212, 175, 55, 0.3);
        }

        .nav-tab {
            padding: 15px 25px;
            margin: 0 5px;
            background: linear-gradient(135deg, #f8f6f0, #ffffff);
            color: #333;
            border: 2px solid rgba(212, 175, 55, 0.3);
            border-radius: 40px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            white-space: nowrap;
            text-decoration: none;
        }

        .nav-tab::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.5s;
        }

        .nav-tab:hover::before {
            left: 100%;
        }

        .nav-tab.active {
            background: linear-gradient(135deg, #d4af37, #f4e4bc);
            color: #000;
            border: 2px solid #b8860b;
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);
            font-weight: 700;
        }

        .nav-tab:hover {
            background: linear-gradient(135deg, #f4e4bc, #d4af37);
            color: #000;
            border: 2px solid #d4af37;
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3);
        }

        .tab-content {
            display: none;
            background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 15px 40px rgba(212, 175, 55, 0.2);
            border: 1px solid #f4e4bc;
            position: relative;
            overflow: hidden;
        }

        .tab-content::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #d4af37, #f4e4bc, #d4af37);
            border-radius: 20px;
            z-index: -1;
            opacity: 0.3;
        }

        .tab-content.active {
            display: block;
            animation: slideInFromBottom 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideInFromBottom {
            from { 
                opacity: 0; 
                transform: translateY(30px) scale(0.95);
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1);
            }
        }

        .rooms-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 30px;
            margin-top: 30px;
        }

        .room-card {
            background: linear-gradient(145deg, #ffffff 0%, #f9f9f9 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid #f4e4bc;
            position: relative;
            display: grid;
            grid-template-rows: 220px 1fr;
        }

        .room-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #d4af37, #f4e4bc, #d4af37);
            transform: scaleX(0);
            transition: transform 0.4s ease;
        }

        .room-card:hover::before {
            transform: scaleX(1);
        }

        .room-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 50px rgba(212, 175, 55, 0.3);
            border-color: #d4af37;
        }

        .room-image {
            height: 220px;
            background: linear-gradient(45deg, #d4af37 0%, #f4e4bc 50%, #b8860b 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3.5em;
            color: #000;
            position: relative;
            overflow: hidden;
        }

        .room-image::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: roomShine 2s ease-in-out infinite;
        }

        @keyframes roomShine {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: -100%; }
        }

        .room-info {
            padding: 30px;
        }

        .room-info h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.5em;
            font-weight: 700;
        }

        .room-price {
            color: #b8860b;
            font-size: 1.9em;
            font-weight: bold;
            margin: 0;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }

        .room-features {
            list-style: none;
            margin: 20px 0;
        }

        .room-features li {
            padding: 8px 0;
            color: #333;
            font-weight: 500;
            position: relative;
            padding-left: 20px;
        }

        .room-features li::before {
            content: '✨';
            position: absolute;
            left: 0;
            top: 8px;
        }

        .btn {
            background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 50%, #b8860b 100%);
            color: #000;
            padding: 15px 35px;
            border: 2px solid #b8860b;
            border-radius: 30px;
            cursor: pointer;
            font-size: 1.1em;
            font-weight: 700;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            width: 100%;
            position: relative;
            overflow: hidden;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.5s;
        }

        .btn:hover::before {
            left: 100%;
        }

        .btn:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 10px 25px rgba(212, 175, 55, 0.5);
            background: linear-gradient(135deg, #f4e4bc 0%, #d4af37 50%, #f4e4bc 100%);
        }

        .btn:active {
            transform: translateY(-1px) scale(1.02);
        }

        .form-group {
            margin-bottom: 25px;
        }

        .form-group label {
            display: block;
            margin-bottom: 10px;
            font-weight: 600;
            color: #333;
            font-size: 1.1em;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 18px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            font-size: 1em;
            transition: all 0.3s ease;
            background: linear-gradient(145deg, #ffffff, #f8f9fa);
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #d4af37;
            box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.2);
            background: #ffffff;
            transform: scale(1.02);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }

        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 30px;
            margin-top: 30px;
        }

        .service-card {
            background: linear-gradient(145deg, #ffffff 0%, #f9f9f9 100%);
            padding: 35px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid #f4e4bc;
            position: relative;
            overflow: hidden;
        }

        .service-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%);
            transform: scale(0);
            transition: transform 0.4s ease;
        }

        .service-card:hover::before {
            transform: scale(1);
        }

        .service-card:hover {
            transform: translateY(-8px) scale(1.02);
            border-color: #d4af37;
            box-shadow: 0 20px 50px rgba(212, 175, 55, 0.3);
        }

        .service-icon {
            font-size: 3.5em;
            margin-bottom: 20px;
            filter: sepia(100%) saturate(200%) hue-rotate(30deg);
            transition: all 0.3s ease;
            position: relative;
            z-index: 2;
        }

        .service-card:hover .service-icon {
            transform: scale(1.1) rotate(5deg);
        }

        .service-card h3 {
            position: relative;
            z-index: 2;
            margin-bottom: 15px;
            color: #333;
            font-weight: 700;
        }

        .service-card p {
            position: relative;
            z-index: 2;
            color: #666;
            line-height: 1.6;
        }

        .reservation-summary {
            background: linear-gradient(135deg, #f8f6f0 0%, #ffffff 100%);
            padding: 30px;
            border-radius: 20px;
            margin-top: 30px;
            border-left: 6px solid #d4af37;
            border: 2px solid #f4e4bc;
            box-shadow: 0 8px 25px rgba(212, 175, 55, 0.2);
            position: relative;
        }

        .contact-info {
            background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 50%, #b8860b 100%);
            color: #000;
            padding: 35px;
            border-radius: 20px;
            margin-top: 30px;
            border: 2px solid #b8860b;
            box-shadow: 0 15px 40px rgba(212, 175, 55, 0.4);
            position: relative;
            overflow: hidden;
        }

        .contact-info::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
            animation: contactShine 4s ease-in-out infinite;
        }

        @keyframes contactShine {
            0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }

        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
        }

        .modal-content {
            background: linear-gradient(145deg, #ffffff, #f9f9f9);
            margin: 5% auto;
            padding: 50px;
            border-radius: 25px;
            width: 90%;
            max-width: 550px;
            position: relative;
            animation: modalSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            border: 3px solid #d4af37;
            box-shadow: 0 25px 60px rgba(0,0,0,0.3);
        }

        @keyframes modalSlideIn {
            from { 
                opacity: 0; 
                transform: translateY(-100px) scale(0.8);
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1);
            }
        }

        .close {
            position: absolute;
            right: 25px;
            top: 25px;
            font-size: 2.5em;
            cursor: pointer;
            color: #999;
            transition: all 0.3s ease;
        }

        .close:hover {
            color: #d4af37;
            transform: scale(1.2) rotate(90deg);
        }

        .success-message {
            text-align: center;
            padding: 30px;
        }

        .success-icon {
            font-size: 5em;
            color: #d4af37;
            margin-bottom: 25px;
            animation: successPulse 2s ease-in-out infinite;
        }

        @keyframes successPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        /* WhatsApp Float Button */
        .whatsapp-float {
            position: fixed;
            width: 70px;
            height: 70px;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(145deg, #25d366, #1da851);
            border-radius: 50px;
            text-align: center;
            font-size: 35px;
            box-shadow: 0 8px 30px rgba(37, 211, 102, 0.4);
            z-index: 100;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: whatsappPulse 3s infinite;
        }

        .whatsapp-float:hover {
            transform: scale(1.15) rotate(5deg);
            box-shadow: 0 12px 40px rgba(37, 211, 102, 0.6);
        }

        .whatsapp-float i {
            color: white;
        }

        @keyframes whatsappPulse {
            0%, 100% {
                box-shadow: 0 8px 30px rgba(37, 211, 102, 0.4), 0 0 0 0 rgba(37, 211, 102, 0.7);
            }
            50% {
                box-shadow: 0 8px 30px rgba(37, 211, 102, 0.4), 0 0 0 15px rgba(37, 211, 102, 0);
            }
        }

        /* Galería mejorada */
        .gallery-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
            margin: 30px 0;
        }

        .gallery-item {
            position: relative;
            height: 280px;
            border-radius: 20px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border: 3px solid #f4e4bc;
            box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);
        }

        .gallery-item:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 25px 60px rgba(212, 175, 55, 0.4);
            border-color: #d4af37;
        }

        .gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: all 0.4s ease;
        }

        .gallery-item:hover img {
            transform: scale(1.1);
        }

        .gallery-placeholder {
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, #d4af37 0%, #f4e4bc 50%, #b8860b 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            color: #000;
            font-size: 1.3em;
            text-align: center;
            padding: 25px;
            font-weight: 600;
        }

        .gallery-placeholder .icon {
            font-size: 3.5em;
            margin-bottom: 15px;
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }

        .gallery-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.9));
            color: white;
            padding: 25px;
            text-align: center;
            transform: translateY(100%);
            transition: transform 0.4s ease;
        }

        .gallery-item:hover .gallery-overlay {
            transform: translateY(0);
        }

        /* Efectos de texto mejorados */
        h2 {
            background: linear-gradient(135deg, #d4af37, #b8860b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
        }

        h3 {
            color: #333;
            font-weight: 700;
        }

        /* Animaciones mejoradas */
        .fade-in {
            animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Responsive mejorado */
        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2.8em;
            }
            
            .nav-tabs {
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .nav-tab {
                margin: 5px;
                flex: 1;
                min-width: 140px;
                padding: 12px 20px;
            }
            
            .rooms-grid {
                grid-template-columns: 1fr;
            }
            
            .services-grid {
                grid-template-columns: 1fr;
            }
            
            .gallery-container {
                grid-template-columns: 1fr;
            }
            
            .modal-content {
                padding: 30px;
                margin: 10% auto;
            }
        }

        @media (max-width: 480px) {
            .container {
                padding: 15px;
            }
            
            .header {
                padding: 30px 15px;
            }
            
            .header h1 {
                font-size: 2.2em;
            }
            
            .tab-content {
                padding: 25px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="logo.png" alt="Logo Complejo Santino" style="height: 250px; margin-bottom: 20px;">
            <p>Hotel & Restobar - Tu lugar ideal para el descanso</p>
            
            <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-top: 30px;">
                <button class="nav-tab active" onclick="showTab('inicio')">🏠 Inicio</button>
                <button class="nav-tab" onclick="showTab('galeria')">📸 Galería</button>
                <button class="nav-tab" onclick="showTab('habitaciones')">🛏️ Habitaciones</button>
                <button class="nav-tab" onclick="showTab('reservas')">📅 Reservar</button>
                <button class="nav-tab" onclick="showTab('servicios')">⭐ Servicios</button>
                <button class="nav-tab" onclick="showTab('contacto')">📞 Contacto</button>
            </div>
        </div>

        <!-- Inicio -->
        <div id="inicio" class="tab-content active">
            <h2>Bienvenidos a Complejo Santino</h2>
            <div style="text-align: center; font-size: 1.2em; line-height: 1.8; color: #555;">
                <p>Nuestro complejo ofrece un entorno ideal para el descanso, con habitaciones distribuidas alrededor de un restaurante central, rodeadas de un amplio parque con piscina y estacionamiento cubierto individual frente a cada unidad.</p>
                <br>
                <p><strong>¿Por qué elegir Complejo Santino?</strong></p>
                <ul style="text-align: left; max-width: 600px; margin: 20px auto; list-style: none;">
                    <li>🏊‍♂️ Amplio parque con piscina para relajarte</li>
                    <li>🚗 Estacionamiento cubierto individual por habitación</li>
                    <li>🍽️ Restaurante a la carta en el centro del complejo</li>
                    <li>📶 Internet Starlink de alta velocidad</li>
                    <li>🐾 Mascotas pequeñas bienvenidas</li>
                    <li>🌳 Entorno natural y tranquilo</li>
                    <li>❄️ Aire acondicionado en todas las habitaciones</li>
                    <li>📺 Smart TV para tu entretenimiento</li>
                </ul>
                <br>
                <div style="background: linear-gradient(135deg, #f8f9fa, #ffffff); padding: 25px; border-radius: 20px; margin: 20px auto; max-width: 500px; border: 2px solid #d4af37; box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);">
                    <h3 style="color: #b8860b; margin-bottom: 20px;">⏰ Horarios</h3>
                    <p><strong>🕛 Check-in:</strong> A partir de las 12:00 hs</p>
                    <p><strong>🕙 Check-out:</strong> Hasta las 10:00 hs</p>
                    <p><strong>🍽️ Restaurante:</strong> 20:00 a 23:30 hs</p>
                    <p style="font-size: 0.9em; color: #666; margin-top: 15px;">*Durante temporada alta los horarios pueden variar</p>
                </div>
            </div>
        </div>

        <!-- Galería -->
        <div id="galeria" class="tab-content">
            <h2>Galería de Fotos</h2>
            <p style="text-align: center; color: #666; margin-bottom: 30px; font-size: 1.1em;">Descubre la belleza y comodidad de Complejo Santino</p>
            
            <!-- Fachada y Recepción -->
            <h3 style="color: #b8860b; margin: 30px 0 20px 0; padding-left: 15px; border-left: 4px solid #d4af37;">🏨 Instalaciones</h3>
            <div class="gallery-container">
                <div class="gallery-item">
                    <img src="fachadahotel.png" alt="Fachada del Hotel" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Fachada Principal</h4>
                        <p>Complejo Santino desde el frente</p>
                    </div>
                </div>
                
                <div class="gallery-item">
                    <img src="recepcion.png" alt="Área de Recepción" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Recepción</h4>
                        <p>Bienvenida cálida y profesional</p>
                    </div>
                </div>
            </div>

            <!-- Habitaciones -->
            <h3 style="color: #b8860b; margin: 40px 0 20px 0; padding-left: 15px; border-left: 4px solid #d4af37;">🛏️ Habitaciones</h3>
            <div class="gallery-container">
                <div class="gallery-item">
                    <img src="foto1habitacion.png" alt="Habitación" loading="lazy">
                </div>
                
                <div class="gallery-item">
                    <img src="foto2habitacion.png" alt="Habitación" loading="lazy">
                </div>
                
                <div class="gallery-item">
                    <img src="foto3habitacion.png" alt="Habitación" loading="lazy">
                </div>
                
                <div class="gallery-item">
                    <img src="foto4habitacion.png" alt="Habitación" loading="lazy">
                </div>
            </div>

            <!-- Piscina -->
            <h3 style="color: #b8860b; margin: 40px 0 20px 0; padding-left: 15px; border-left: 4px solid #d4af37;">🏊‍♂️ Área de Piscina</h3>
            <div class="gallery-container">
                <div class="gallery-item">
                    <img src="piscina1.png" alt="Piscina" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Piscina Principal</h4>
                        <p>Refréscate en nuestras aguas</p>
                    </div>
                </div>
                
                <div class="gallery-item">
                    <img src="piscina2.png" alt="Piscina" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Vista de la Piscina</h4>
                        <p>Relajación garantizada</p>
                    </div>
                </div>
                
                <div class="gallery-item">
                    <img src="piscina3.png" alt="Piscina" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Área de Descanso</h4>
                        <p>Disfruta del sol y la tranquilidad</p>
                    </div>
                </div>
                
                <div class="gallery-item">
                    <img src="piscina4.png" alt="Piscina" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Vista Panorámica</h4>
                        <p>El lugar perfecto para relajarse</p>
                    </div>
                </div>
            </div>

            <!-- Parque -->
            <h3 style="color: #b8860b; margin: 40px 0 20px 0; padding-left: 15px; border-left: 4px solid #d4af37;">🌳 Parque y Jardines</h3>
            <div class="gallery-container">
                <div class="gallery-item">
                    <img src="parque1.png" alt="Parque" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Espacios Verdes</h4>
                        <p>Naturaleza y tranquilidad</p>
                    </div>
                </div>
                
                <div class="gallery-item">
                    <img src="parque2.png" alt="Parque" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Jardines del Complejo</h4>
                        <p>Ambiente natural y relajante</p>
                    </div>
                </div>
                
                <div class="gallery-item">
                    <img src="parque3.png" alt="Parque" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>Áreas de Recreación</h4>
                        <p>Espacios para disfrutar al aire libre</p>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 25px; background: linear-gradient(135deg, #f8f6f0 0%, #ffffff 100%); border-radius: 20px; border: 2px solid #d4af37; box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);">
                <h3 style="color: #b8860b; margin-bottom: 15px;">📸 Galería Completa</h3>
                <p style="color: #333; font-size: 1.1em;">Estas son las instalaciones reales de Complejo Santino. ¡Ven a conocernos y experimenta la comodidad que ofrecemos!</p>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">Fotos actualizadas - Temporada 2025</p>
            </div>
        </div>

        <!-- Habitaciones -->
        <div id="habitaciones" class="tab-content">
            <h2>Nuestras Habitaciones</h2>
            <div class="rooms-grid">
                <div class="room-card">
                    <div class="room-image">🛏️</div>
                    <div class="room-info">
                        <h3>Habitación Estándar</h3>
                        <div class="room-price">Consultar tarifa</div>
                        <ul class="room-features">
                            <li>Aire acondicionado</li>
                            <li>Smart TV</li>
                            <li>Baño privado</li>
                            <li>Termotanque eléctrico</li>
                            <li>Ropa de cama y toallas</li>
                            <li>Internet Starlink</li>
                            <li>Estacionamiento cubierto</li>
                        </ul>
                        <button class="btn" onclick="selectRoom('Estándar', 0)">Seleccionar</button>
                    </div>
                </div>

                <div class="room-card">
                    <div class="room-image">⭐</div>
                    <div class="room-info">
                        <h3>Habitación Confort</h3>
                        <div class="room-price">Consultar tarifa</div>
                        <ul class="room-features">
                            <li>Todo lo de Estándar, más:</li>
                            <li>Frigobar</li>
                            <li>Pava eléctrica</li>
                            <li>Secador de cabello</li>
                        </ul>
                        <button class="btn" onclick="selectRoom('Confort', 0)">Seleccionar</button>
                    </div>
                </div>
            </div>

            <div style="background: linear-gradient(135deg, #fff3cd, #ffeaa7); border: 2px solid #d4af37; border-radius: 20px; padding: 25px; margin-top: 30px; box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);">
                <h3 style="color: #b8860b; margin-bottom: 20px;">🐾 Política de Mascotas</h3>
                <p style="color: #333; margin: 8px 0; font-weight: 500;">• Mascotas pequeñas bienvenidas</p>
                <p style="color: #333; margin: 8px 0; font-weight: 500;">• Costo adicional: $7.000 por mascota</p>
                <p style="color: #333; margin: 8px 0; font-weight: 500;">• Deben traer su camita y correa</p>
                <p style="color: #333; margin: 8px 0; font-weight: 500;">• No se permite el ingreso al restaurante</p>
                <p style="color: #666; margin: 15px 0 0 0; font-size: 0.9em;">*La administración se reserva el derecho de admisión</p>
            </div>
        </div>

        <!-- Reservas -->
        <div id="reservas" class="tab-content">
            <h2>Realizar Reserva</h2>
            <form id="reservationForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="checkin">Fecha de Check-in</label>
                        <input type="date" id="checkin" name="checkin" required>
                    </div>
                    <div class="form-group">
                        <label for="checkout">Fecha de Check-out</label>
                        <input type="date" id="checkout" name="checkout" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="guests">Número de Huéspedes</label>
                        <select id="guests" name="guests" required>
                            <option value="1">1 Huésped</option>
                            <option value="2">2 Huéspedes</option>
                            <option value="3">3 Huéspedes</option>
                            <option value="4">4 Huéspedes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="roomType">Tipo de Habitación</label>
                        <select id="roomType" name="roomType" required>
                            <option value="">Seleccionar habitación</option>
                            <option value="Estándar">Habitación Estándar</option>
                            <option value="Confort">Habitación Confort</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="firstName">Nombre</label>
                        <input type="text" id="firstName" name="firstName" required>
                    </div>
                    <div class="form-group">
                        <label for="lastName">Apellido</label>
                        <input type="text" id="lastName" name="lastName" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Teléfono</label>
                        <input type="tel" id="phone" name="phone" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="requests">Solicitudes Especiales</label>
                    <textarea id="requests" name="requests" rows="4" placeholder="Ej: traerá mascota, necesidades especiales, horario estimado de llegada, etc."></textarea>
                </div>

                <div class="form-group">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 600; white-space: nowrap;">Viajaré con mascota pequeña (+$7.000) • Recuerda traer camita y correa. No permitido en restaurante.</span>
                        <input type="checkbox" id="petCheckbox" name="pet" style="transform: scale(1.2); margin-left: 20px;">
                    </div>
                </div>

                <div class="reservation-summary" id="reservationSummary" style="display: none;">
                    <h3 style="color: #b8860b; margin-bottom: 20px;">📋 Resumen de Reserva</h3>
                    <div id="summaryDetails"></div>
                </div>

                <button type="submit" class="btn" style="margin-top: 25px;">Confirmar Reserva</button>
            </form>
        </div>

        <!-- Servicios -->
        <div id="servicios" class="tab-content">
            <h2>Nuestros Servicios</h2>
            <div class="services-grid">
                <div class="service-card">
                    <div class="service-icon">🍽️</div>
                    <h3>Restaurante a la Carta</h3>
                    <p>Disfruta de nuestra exquisita propuesta gastronómica en el corazón del complejo. Abierto todos los días de 20:00 a 23:30 hs.</p>
                </div>
                <div class="service-card">
                    <div class="service-icon">🏊‍♂️</div>
                    <h3>Piscina & Parque</h3>
                    <p>Relájate en nuestro amplio parque con piscina, el lugar perfecto para descansar y disfrutar del aire libre.</p>
                </div>
                <div class="service-card">
                    <div class="service-icon">🚗</div>
                    <h3>Estacionamiento Cubierto</h3>
                    <p>Cada habitación cuenta con su propio estacionamiento cubierto individual ubicado justo frente a la unidad.</p>
                </div>
                <div class="service-card">
                    <div class="service-icon">📶</div>
                    <h3>Internet Starlink</h3>
                    <p>Conexión a internet de alta velocidad vía satélite Starlink en todo el complejo para mantenerte conectado.</p>
                </div>
                <div class="service-card">
                    <div class="service-icon">🐾</div>
                    <h3>Pet Friendly</h3>
                    <p>Recibimos mascotas pequeñas con costo adicional. Tu compañero fiel también puede disfrutar de sus vacaciones.</p>
                </div>
                <div class="service-card">
                    <div class="service-icon">❄️</div>
                    <h3>Confort Garantizado</h3>
                    <p>Todas nuestras habitaciones cuentan con aire acondicionado, Smart TV y todas las comodidades para tu estadía.</p>
                </div>
            </div>
        </div>

        <!-- Contacto -->
        <div id="contacto" class="tab-content">
            <h2>Contacto</h2>
            <div class="contact-info">
                <h3 style="margin-bottom: 25px; font-size: 1.5em; position: relative; z-index: 2;">🏨 Complejo Santino - Hotel & Restobar</h3>
                <p style="position: relative; z-index: 2; margin: 10px 0; font-size: 1.1em;"><strong>📍 Dirección:</strong> Ruta 14 km 683 (A 50 metros de la rotonda de acceso al puente)</p>
                <p style="position: relative; z-index: 2; margin: 10px 0; font-size: 1.1em;"><strong>📞 Teléfono:</strong> <a href="tel:+5493756444420" style="color: #000; text-decoration: underline;">3756444420</a></p>
                <p style="position: relative; z-index: 2; margin: 10px 0; font-size: 1.1em;"><strong>📧 Email:</strong> <a href="mailto:lascasitasdesantino@hotmail.com" style="color: #000; text-decoration: underline;">lascasitasdesantino@hotmail.com</a></p>
                <p style="position: relative; z-index: 2; margin: 10px 0; font-size: 1.1em;"><strong>🌐 Instagram:</strong> <a href="https://instagram.com/lascasitasdesantino" target="_blank" style="color: #000; text-decoration: underline;">@lascasitasdesantino</a></p>
                <br>
                <h4 style="position: relative; z-index: 2; margin-bottom: 15px;">⏰ Horarios de Atención:</h4>
                <p style="position: relative; z-index: 2; margin: 8px 0;">🕛 Check-in: A partir de las 12:00 hs</p>
                <p style="position: relative; z-index: 2; margin: 8px 0;">🕙 Check-out: Hasta las 10:00 hs</p>
                <p style="position: relative; z-index: 2; margin: 8px 0;">🍽️ Restaurante: 20:00 a 23:30 hs (todos los días)</p>
                <p style="font-size: 0.9em; opacity: 0.8; position: relative; z-index: 2; margin-top: 10px;">*Durante temporada alta los horarios pueden variar</p>
            </div>
            
            <div style="background: linear-gradient(145deg, #ffffff, #f9f9f9); padding: 35px; border-radius: 20px; margin-top: 30px; box-shadow: 0 15px 40px rgba(212, 175, 55, 0.3); border: 2px solid #d4af37;">
                <h3 style="margin-bottom: 25px; color: #333; font-size: 1.4em;">💬 Envíanos un Mensaje</h3>
                <form id="contactForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="contactName">Nombre</label>
                            <input type="text" id="contactName" name="contactName" required>
                        </div>
                        <div class="form-group">
                            <label for="contactEmail">Email</label>
                            <input type="email" id="contactEmail" name="contactEmail" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="subject">Asunto</label>
                        <input type="text" id="subject" name="subject" required>
                    </div>
                    <div class="form-group">
                        <label for="message">Mensaje</label>
                        <textarea id="message" name="message" rows="5" required></textarea>
                    </div>
                    <button type="submit" class="btn">Enviar Mensaje</button>
                </form>
            </div>
        </div>
    </div>

    <!-- WhatsApp Float Button -->
    <div class="whatsapp-float" onclick="openWhatsApp()">
        💬
    </div>

    <!-- Modal de Confirmación -->
    <div id="confirmationModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <div class="success-message">
                <div class="success-icon">✅</div>
                <h2 style="color: #333; margin-bottom: 20px;">¡Reserva Confirmada!</h2>
                <p style="margin-bottom: 15px; font-size: 1.1em;">Tu reserva ha sido enviada exitosamente a nuestro sistema de gestión.</p>
                <p style="margin-bottom: 15px;"><strong>Número de Confirmación:</strong> <span id="confirmationNumber" style="color: #d4af37; font-weight: 700;"></span></p>
                <p style="color: #666;">Recibirás un email de confirmación en breve.</p>
            </div>
        </div>
    </div>

    <script>
        // Variables globales
        let reservationData = {};

        // Funcionalidad de pestañas
        function showTab(tabName) {
            // Ocultar todas las pestañas
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Remover clase active de todos los botones
            const tabButtons = document.querySelectorAll('.nav-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Mostrar la pestaña seleccionada
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        // Función WhatsApp mejorada
        function openWhatsApp() {
            // Número de WhatsApp del hotel (número real del Complejo Santino)
            const phoneNumber = '5493756444420'; // Número real del hotel
            
            // Crear mensaje preformateado
            const whatsappMessage = `¡Hola! Me interesa obtener más información sobre Complejo Santino Hotel & Restobar.

🏨 Me gustaría consultar sobre:
• Disponibilidad de habitaciones
• Tarifas y promociones
• Servicios incluidos

*Mensaje enviado desde la web oficial*`;
            
            // Crear URL de WhatsApp
            const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
            
            // Abrir WhatsApp
            window.open(whatsappURL, '_blank');
        }

        // Seleccionar habitación desde la página de habitaciones
        function selectRoom(roomType, price) {
            showTab('reservas');
            document.getElementById('roomType').value = roomType;
            updateReservationSummary();
            
            // Actualizar el botón activo
            const tabButtons = document.querySelectorAll('.nav-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabButtons[3].classList.add('active'); // Botón de reservas
        }

        // Actualizar resumen de reserva
        function updateReservationSummary() {
            const checkin = document.getElementById('checkin').value;
            const checkout = document.getElementById('checkout').value;
            const roomType = document.getElementById('roomType').value;
            const guests = document.getElementById('guests').value;
            const pet = document.getElementById('petCheckbox').checked;

            if (checkin && checkout && roomType) {
                const checkinDate = new Date(checkin);
                const checkoutDate = new Date(checkout);
                const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
                
                let summaryHtml = `
                    <div style="background: linear-gradient(135deg, #ffffff, #f8f9fa); padding: 20px; border-radius: 15px; border-left: 4px solid #d4af37;">
                        <p style="margin: 8px 0; font-size: 1.1em;"><strong>🏨 Habitación:</strong> ${roomType}</p>
                        <p style="margin: 8px 0;"><strong>📅 Check-in:</strong> ${formatDate(checkinDate)} (desde las 12:00 hs)</p>
                        <p style="margin: 8px 0;"><strong>📅 Check-out:</strong> ${formatDate(checkoutDate)} (hasta las 10:00 hs)</p>
                        <p style="margin: 8px 0;"><strong>🌙 Noches:</strong> ${nights}</p>
                        <p style="margin: 8px 0;"><strong>👥 Huéspedes:</strong> ${guests}</p>
                `;

                if (pet) {
                    summaryHtml += `<p style="margin: 8px 0;"><strong>🐾 Mascota:</strong> Sí (+$7.000)</p>`;
                }

                summaryHtml += `<p style="font-size: 1.2em; color: #b8860b; margin: 15px 0 5px 0; font-weight: 700;"><strong>💰 Tarifa:</strong> Consultar al confirmar</p>
                    </div>`;

                document.getElementById('summaryDetails').innerHTML = summaryHtml;
                document.getElementById('reservationSummary').style.display = 'block';
            }
        }

        // Formatear fecha
        function formatDate(date) {
            return date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Generar número de confirmación
        function generateConfirmationNumber() {
            return 'CS' + Date.now().toString().slice(-8);
        }

        // Enviar datos al sistema de gestión
        async function sendToManagementSystem(reservationData) {
            try {
                // URL de tu backend en Railway
                const API_URL = 'https://tu-proyecto.railway.app'; // ← CAMBIAR POR TU URL REAL
                
                const response = await fetch(`${API_URL}/reservas-web`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        firstName: reservationData.firstName,
                        lastName: reservationData.lastName,
                        email: reservationData.email,
                        phone: reservationData.phone,
                        checkin: reservationData.checkin,
                        checkout: reservationData.checkout,
                        roomType: reservationData.roomType,
                        guests: parseInt(reservationData.guests),
                        requests: reservationData.requests,
                        pet: reservationData.pet === 'on'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    return result.confirmacion;
                } else {
                    throw new Error(result.error || 'Error desconocido');
                }
                
            } catch (error) {
                console.error('Error de conexión:', error);
                throw new Error('No se pudo conectar con el sistema de reservas. Por favor intenta nuevamente.');
            }
        }

        // Manejar envío de formulario de reserva
        document.getElementById('reservationForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            // Mostrar estado de carga
            submitButton.textContent = 'Procesando...';
            submitButton.disabled = true;
            
            const formData = new FormData(this);
            reservationData = Object.fromEntries(formData.entries());
            
            try {
                const confirmationNumber = await sendToManagementSystem(reservationData);
                document.getElementById('confirmationNumber').textContent = confirmationNumber;
                document.getElementById('confirmationModal').style.display = 'block';
                
                // Limpiar formulario
                this.reset();
                document.getElementById('reservationSummary').style.display = 'none';
                
            } catch (error) {
                console.error('Error al procesar la reserva:', error);
                alert('Hubo un error al procesar tu reserva. Por favor intenta nuevamente.');
            } finally {
                // Restaurar botón
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });

        // Manejar formulario de contacto
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            // Simular envío
            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;
            
            setTimeout(() => {
                alert('¡Gracias por tu mensaje! Nos pondremos en contacto contigo pronto.');
                this.reset();
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 1000);
        });

        // Cerrar modal
        function closeModal() {
            document.getElementById('confirmationModal').style.display = 'none';
        }

        // Cerrar modal al hacer clic fuera de él
        window.onclick = function(event) {
            const confirmationModal = document.getElementById('confirmationModal');
            
            if (event.target == confirmationModal) {
                confirmationModal.style.display = 'none';
            }
        }

        // Event listeners para actualizar resumen
        document.getElementById('checkin').addEventListener('change', updateReservationSummary);
        document.getElementById('checkout').addEventListener('change', updateReservationSummary);
        document.getElementById('roomType').addEventListener('change', updateReservationSummary);
        document.getElementById('guests').addEventListener('change', updateReservationSummary);
        document.getElementById('petCheckbox').addEventListener('change', updateReservationSummary);

        // Establecer fecha mínima como hoy
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('checkin').min = today;
        document.getElementById('checkout').min = today;

        // Validar que checkout sea después de checkin
        document.getElementById('checkin').addEventListener('change', function() {
            const checkinDate = new Date(this.value);
            const nextDay = new Date(checkinDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            document.getElementById('checkout').min = nextDay.toISOString().split('T')[0];
            
            // Si checkout es anterior a la nueva fecha mínima, actualizarlo
            const checkoutInput = document.getElementById('checkout');
            if (checkoutInput.value && new Date(checkoutInput.value) <= checkinDate) {
                checkoutInput.value = nextDay.toISOString().split('T')[0];
                updateReservationSummary();
            }
        });

        // Animaciones al scroll (opcional)
        function isElementInViewport(el) {
            const rect = el.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        }

        function handleScrollAnimations() {
            const animatedElements = document.querySelectorAll('.room-card, .service-card, .gallery-item');
            
            animatedElements.forEach(el => {
                if (isElementInViewport(el) && !el.classList.contains('fade-in')) {
                    el.classList.add('fade-in');
                }
            });
        }

        // Ejecutar animaciones en scroll (opcional)
        window.addEventListener('scroll', handleScrollAnimations);
        window.addEventListener('load', handleScrollAnimations);
    </script>
</body>
</html>