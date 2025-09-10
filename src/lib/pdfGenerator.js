import jsPDF from 'jspdf';
import axios from 'axios';
import { supabase } from '@/lib/customSupabaseClient';

const logoUrl = 'https://storage.googleapis.com/hostinger-horizons-assets-prod/f80cb88e-90d5-4a1b-b1dd-40404cb3c7a5/4f0066d0557165926ac727a8ad71f9be.png';

const getBase64Image = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to fetch or convert image:", error);
    return null; 
  }
};

const addPhotosToPdf = (doc, photos) => {
    if (!photos) return;
    
    const { ineFront, ineBack, circulation } = photos;
    const photoWidth = 84;
    const photoHeight = 52.5;
    const margin = 15;
    const startY = 40;

    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Documentos Anexos', 105, 20, { align: 'center' });

    if (ineFront) {
        doc.setFontSize(10);
        doc.text('Frente del INE', margin, startY - 5);
        doc.addImage(ineFront, 'JPEG', margin, startY, photoWidth, photoHeight);
    }
    
    if (ineBack) {
        doc.setFontSize(10);
        doc.text('Reverso del INE', margin, startY + photoHeight + 15);
        doc.addImage(ineBack, 'JPEG', margin, startY + photoHeight + 20, photoWidth, photoHeight);
    }

    if (circulation) {
        doc.setFontSize(10);
        doc.text('Tarjeta de Circulación', margin, startY + (photoHeight + 20) * 2 - 5);
        doc.addImage(circulation, 'JPEG', margin, startY + (photoHeight + 20) * 2, photoWidth, photoHeight);
    }
};

const triggerDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateAndUploadPdf = async (type, data, signature) => {
  const doc = new jsPDF();
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  let fileName;
  let folder;

  const logoBase64 = await getBase64Image(logoUrl);
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 12, 50, 13);
  }

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Tecámac, Estado de México a ${formattedDate}`, 200, 20, { align: 'right' });

  if (type === 'baja') {
    folder = 'Bajas';
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Comprobante de Baja de Acceso Vehicular', 105, 40, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const etiquetaText = data.Etiqueta === 'APP' ? `la aplicación móvil identificada con el número: ${data.Identificador}` : `el TAG identificado con el número: ${data.Etiqueta}`;
    
    const textLines = doc.splitTextToSize([
      `El(los) propietario(s) ${data.Nombre}, solicita(n) la baja del acceso vehicular por ${etiquetaText}.`,
      'Declara(n) ser mayor de edad y estar al corriente en la cuotas de mantenimiento de Comunidad Decidida, Asociación Civil.',
      'Acepta(n) presentar su identificación oficial INE en mano, tipo selfie para la verificación del tramite y se compromete(n) a que los datos proporcionados son verídicos.',
      'Conoce(n) que tras la baja, perderá(n) el acceso vehicular y los beneficios asociados. Los datos personales serán tratados con confidencialidad según la Ley Federal de Protección de Datos Personales.'
    ].join('\n\n'), 170);
    doc.text(textLines, 20, 60);

    if (data.bajaType === 'presencial' && signature) {
        doc.addImage(signature, 'PNG', 20, 120, 50, 25);
    }

    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA PROPIETARIO / REPRESENTANTE', 20, 150);

    if (data.bajaType === 'whatsapp') {
        doc.text('PROPIETARIO CONFIRMA BAJA POR WHATSAPP', 20, 170);
    }
    
    const fileIdentifier = data.Etiqueta === 'APP' ? data.Identificador : data.Etiqueta;
    fileName = `Politica_Baja_${data.IDSAE}_${fileIdentifier}.pdf`;
  } else { 
    folder = 'Altas';
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Comprobante de Entrega de Tag de Acceso Vehicular', 105, 40, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const etiquetaText = data.Tipo === 'APP' ? `Aplicación Móvil identificado con el número: ${data.Identificador}` : `TAG identificado con el número: ${data.Etiqueta}`;
    const textLines1 = doc.splitTextToSize(`Yo ${data.Nombre}, propietario del domicilio ubicado en ${data.Direccion}, y hago constar que he recibido de Comunidad Decidida el Acceso Vehicular ${etiquetaText}.`, 170);
    doc.text(textLines1, 20, 60);
    doc.setFont('helvetica', 'bold');
    doc.text('He presentado la siguiente documentación vigente:', 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.text('- INE', 25, 90);
    doc.text('- CARTA PODER (EN SU CASO)', 25, 97);
    doc.text('- TARJETA DE CIRCULACIÓN', 25, 104);
    const textLines2 = doc.splitTextToSize([
      'Haciéndome en este acto responsable del uso indebido que pudiera darse a dicho dispositivo de acceso.',
      'De igual forma, al firmar la presente, asumo la responsabilidad por cualquier daño en perjuicio del Conjunto, y a cumplir con lo establecido en el reglamento de uso de Tag vigente, el cual se anexa a la presente, que incluye las sanciones administrativas conducentes.',
      'Conforme a lo dispuesto en la ley que regula la propiedad en condominio del Estado de México, CAPITULO TERCERO, ARTÍCULO 15, seré solidariamente responsable junto con mi arrendatario o familiar por el uso indebido del dispositivo móvil o Tag.',
      'Recibo y acepto el reglamento de uso de Tag y normatividad vigente, así como las condiciones del Aviso de Privacidad.'
    ].join('\n\n'), 170);
    doc.text(textLines2, 20, 115);
    if (signature) {
      doc.addImage(signature, 'PNG', 20, 195, 50, 25);
    }
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA PROPIETARIO / REPRESENTANTE', 20, 230);
    fileName = `Politica_alta_tag_${data.IDSAE}_${data.Tipo === 'APP' ? data.Identificador : data.Etiqueta}.pdf`;
  }

  doc.setFont('helvetica', 'normal');
  const finalY = type === 'baja' ? 190 : 250;
  doc.text('ATENTAMENTE', 105, finalY, { align: 'center' });
  doc.text('Administrador General y Consejo Directivo', 105, finalY + 10, { align: 'center' });
  doc.text('GESTIÓN 2024-2027', 105, finalY + 20, { align: 'center' });
  doc.text('Informes y tramites administrativos: 55 76 99 86 20 // WhatsApp 55 37 85 09 54', 105, finalY + 30, { align: 'center' });

  if (data.photos) {
    addPhotosToPdf(doc, data.photos);
  }

  const pdfBlob = doc.output('blob');
  
  triggerDownload(pdfBlob, fileName);
  
  const netlifyFunctionUrl = '/.netlify/functions/s3-handler';

  try {
    const response = await axios.post(
      netlifyFunctionUrl,
      {
        fileName: `${folder}/${fileName}`,
        fileBody: Array.from(new Uint8Array(await pdfBlob.arrayBuffer())),
        contentType: pdfBlob.type,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (response.status !== 200) {
      throw new Error(`Error en el servidor: ${response.data.error || 'Ocurrió un error desconocido'}`);
    }
    
    return response.data;

  } catch (error) {
    if (error.response) {
      throw new Error(`Error del servidor: ${error.response.data.error}`);
    } else if (error.request) {
      throw new Error('No se pudo comunicar con el servidor. Revisa tu conexión.');
    } else {
      throw new Error(`Error al preparar la solicitud: ${error.message}`);
    }
  }
};