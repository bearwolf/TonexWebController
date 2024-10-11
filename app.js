const knobConfigs = [
    { id: 'row1', knobs: [
        { cc: 102, name: 'Gain' },
        { cc: 23, name: 'Bass' },
        { cc: 25, name: 'Mid' },
        { cc: 28, name: 'Treble' },
        { cc: 106, name: 'Presence' },
        { cc: 107, name: 'Depth' },
        { cc: 103, name: 'Model volume' },
    ]},
    { id: 'row2', knobs: [
        { cc: 85, name: 'Reverb type' },
        { cc: 77, name: 'Pre-delay' },
        { cc: 76, name: 'Time' },
        { cc: 79, name: 'Mix' },
    ], toggle: { cc: 75, name: 'Reverb' }},
    { id: 'row3', knobs: [
        { cc: 15, name: 'Threshold' },
        { cc: 16, name: 'Release' },
        { cc: 17, name: 'Depth' },
    ], toggle: { cc: 14, name: 'Noise gate' }},
    { id: 'row4', knobs: [
        { cc: 19, name: 'Threshold' },
        { cc: 20, name: 'Gain' },
        { cc: 21, name: 'Attack' },
        { cc: 22, name: 'Pre/Post' },
    ], toggle: { cc: 18, name: 'Compressor' }},
];

let midiOutput = null;
let midiChannel = 0; // Standardkanal 1

function createKnobs() {
    knobConfigs.forEach(({ id, knobs, toggle }) => {
        const row = document.getElementById(id);

        if (toggle) {
            const toggleButton = document.createElement('button');
            toggleButton.innerHTML = `${toggle.name}<br>On/Off`; 
            toggleButton.className = 'toggle-button';
            toggleButton.dataset.state = 'off';
            toggleButton.style.backgroundColor = '#D3D3D3';
            toggleButton.style.fontSize = '1em'; // Gör texten större
            toggleButton.style.fontWeight = 'bold'; // Gör texten fet
            //toggleButton.style.padding = '10px 20px'; // Lägg till padding
            toggleButton.style.borderRadius = '5px'; 
            toggleButton.addEventListener('click', () => {
                const newState = toggleButton.dataset.state === 'off' ? 'on' : 'off';
                toggleButton.dataset.state = newState;
                const value = newState === 'on' ? 127 : 0;
                toggleButton.style.backgroundColor = newState === 'on' ? '#00FF00' : '#D3D3D3';
                sendMIDICC(toggle.cc, value);
                console.log(`Toggle-knapp (CC ${toggle.cc}): Skickat värde ${value}`);
            });
            row.appendChild(toggleButton);
        }


        knobs.forEach(({ cc, name }) => {
            const knobContainer = document.createElement('div');
            knobContainer.className = 'knob-container';

            const canvas = document.createElement('canvas');
            canvas.className = 'knob';
            canvas.width = 100;
            canvas.height = 100;
            canvas.dataset.value = 63;
            canvas.dataset.cc = cc;
            drawKnob(canvas, 63);

            const label = document.createElement('div');
            label.className = 'label';
            const displayValue = ((63 / 127) * 10).toFixed(1); // Omräknat visningsvärde
            label.innerHTML = `${name}<br>${displayValue}`;

            knobContainer.appendChild(canvas);
            knobContainer.appendChild(label);
            row.appendChild(knobContainer);

            setupKnob(canvas, label);
        });


    });
}

function drawKnob(canvas, value) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fyll cirkeln
    // Skapa en radial gradient
    const gradient = ctx.createRadialGradient(50, 50, 20, 50, 50, 40);
    gradient.addColorStop(0, '#ffffff'); // Mittfärg
    gradient.addColorStop(1, '#abbaab'); // Kantfärg

    // Använd gradienten som fillStyle
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(50, 50, 40, 0, 2 * Math.PI);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.arc(50, 50, 40, 0, 2 * Math.PI);
    ctx.stroke();

    // Beräkna rotationsvinkeln
    const startDegrees = 120;
    const endDegrees = 420;
    const minAngle = (startDegrees * Math.PI) / 180;
    const maxAngle = (endDegrees * Math.PI) / 180;
    const rotationAngle = minAngle + (value / 127) * (maxAngle - minAngle);

    // Rita notches med rotation
    const numNotches = 20;
    for (let i = 0; i < numNotches; i++) {
        const notchAngle = rotationAngle + (i / numNotches) * 2 * Math.PI;
        const innerRadius = 34;
        const outerRadius = 40;
        const x1 = 50 + innerRadius * Math.cos(notchAngle);
        const y1 = 50 + innerRadius * Math.sin(notchAngle);
        const x2 = 50 + outerRadius * Math.cos(notchAngle);
        const y2 = 50 + outerRadius * Math.sin(notchAngle);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Rita indikatorn
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(50 + 40 * Math.cos(rotationAngle), 50 + 40 * Math.sin(rotationAngle));
    ctx.stroke();
}

function setupKnob(canvas, label) {
    let startY = null;
    let value = parseInt(canvas.dataset.value, 10);
    const ccNumber = parseInt(canvas.dataset.cc, 10);

    canvas.addEventListener('mousedown', (event) => {
        startY = event.clientY;

        function onMouseMove(event) {
            const delta = startY - event.clientY;
            value = Math.max(0, Math.min(127, value + delta / 2));
            value = Math.round(value);
            canvas.dataset.value = value;
            startY = event.clientY;

            drawKnob(canvas, value);

            // Skala om värdet för visning
            const displayValue = ((value / 127) * 10).toFixed(1);
            label.innerHTML = `${label.innerHTML.split('<br>')[0]}<br>${displayValue}`;

            sendMIDICC(ccNumber, value);
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

function sendMIDICC(ccNumber, value) {
    if (midiOutput) {
        const controlChangeMessage = [0xB0 + midiChannel, ccNumber, value];
        midiOutput.send(controlChangeMessage);
        console.log(`MIDI CC ${ccNumber} på kanal ${midiChannel + 1} skickat:`, value);
    }
}

async function initMIDI() {
    try {
        const midiAccess = await navigator.requestMIDIAccess();
        const outputs = Array.from(midiAccess.outputs.values());
        const select = document.getElementById('midi-outputs');

        outputs.forEach((output, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = output.name;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            midiOutput = outputs[select.selectedIndex];
            console.log(`Vald MIDI-utgång: ${midiOutput.name}`);
        });

        if (outputs.length > 0) {
            midiOutput = outputs[0];
            console.log(`Initial MIDI-utgång: ${midiOutput.name}`);
        } else {
            console.log('Ingen MIDI-utgång hittades');
        }

        document.getElementById('midi-channel').addEventListener('change', (event) => {
            midiChannel = parseInt(event.target.value);
            console.log(`Vald MIDI-kanal: ${midiChannel + 1}`);
        });

    } catch (error) {
        console.error('MIDI-åtkomst misslyckades:', error);
    }
}

createKnobs();
initMIDI();