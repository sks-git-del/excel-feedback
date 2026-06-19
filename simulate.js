const axios = require('axios');

const studentsRaw = `Debasis prusty, debasis.prusty01@gmail.com, 23110649
Bhumika Kalasi, bhumika.kalasi02@gmail.com, 23110641
Biswajeet Dash, biswajeet.dash03@gmail.com, 23110643
SAI PRASAD KAR, sai.prasad04@gmail.com, 23110677
GYANARANJAN MOHARANA, gyanaranjan05@gmail.com, 23110655
Akash Lakra, akash.lakra06@gmail.com, 23110631
Pradyush Kumar Jena, pradyush.jena07@gmail.com, 23110644
Smarika Behera, smarika.behera08@gmail.com, 23110694
Anandita Sahoo, anandita.sahoo09@gmail.com, 23110633
Sambit Kumar Mohanty, sambit.mohanty10@gmail.com, 23110899
Milan Dhal, milan.dhal11@gmail.com, 23110660
Dibyarajan Katual, dibyarajan12@gmail.com, 23110651
Arpana Kujur, arpana.kujur13@gmail.com, 23110636
Himangi Swain, himangi.swain14@gmail.com, 23110656
Chandan Kumar Satapathy, chandan15@gmail.com, 23110645
Divyasha Nayak, divyasha.nayak16@gmail.com, 23110653
Debanshu Kumar Pradhan, debanshu17@gmail.com, 23110648
Shubhashree Mohanty, shubhashree18@gmail.com, 23110690
Smarak Kumar Pradhan, smarak19@gmail.com, 23110693
Siddhi Pradayanee Sahoo, siddhi20@gmail.com, 24120071
Puspanjali Behera, puspanjali21@gmail.com, 23110671
Ritik Gourav Raul, ritik22@gmail.com, 23110799
Preetesh Khadanga, preetesh23@gmail.com, 23110667
Debadutta Patel, debadutta24@gmail.com, 23110432
Bhumika Mahalik, bhumika25@gmail.com, 23110642
Jyotir Aditya Rout, jyotir26@gmail.com, 23110657
Subham Maheswari Jena, subham27@gmail.com, 23110696
Abhay Abhinandan, abhay28@gmail.com, 23110625
Rasmi Ranjan Nayak, rasmi29@gmail.com, 23110672
Saisuman Dash, saisuman30@gmail.com, 23110678
Aditya Agarwal, aditya31@gmail.com, 23110628
Jasasmita Sahoo, jasasmita32@gmail.com, 24120066
Pratik Raj Senapati, pratik33@gmail.com, 24120067
Om Prasad Sahoo, om34@gmail.com, 23110665
Sashanka Sekhar Swain, sashanka35@gmail.com, 23110682
Girindra Maharana, girindra36@gmail.com, 23110654
Shradha Suman Mohapatra, shradha37@gmail.com, 23110688
Ayush Simon Barwa, ayush38@gmail.com, 23110639
Soumyadeepta Patel, soumya39@gmail.com, 23110695
Novtej Mallick, novtej40@gmail.com, 23110664
Abhisek Panda, abhisek41@gmail.com, 23110627
Sarbesha Jena, sarbesha42@gmail.com, 23110680
M. K. Sanket, sanket43@gmail.com, 23110658
Sankar Kumar Nayak, sankar44@gmail.com, 23110680
Nilima Lakra, nilima45@gmail.com, 23110663
Subhranshu Naik, subhranshu46@gmail.com, 23110698
B Arya Kumari Sameekshya, arya47@gmail.com, 23110640
Ayush Dash, ayush48@gmail.com, 23110638
Sibaditya Ashirbad, sibaditya49@gmail.com, 23110692
Priyanka Mallick, priyanka50@gmail.com, 23110668
Puneet Kumar Dhal, puneet51@gmail.com, 23110669
Navycut Dehury, navycut52@gmail.com, 23110662
Shubhajit Kumar Senapati, shubhajit53@gmail.com, 23110689
Disha Agarwal, disha54@gmail.com, 23110652
Utkal Kumar Das, utkal55@gmail.com, 23110921
Debabrata Sahoo, debabrata56@gmail.com, 23110647
Monalisha Patra, monalisha57@gmail.com, 23110661
Abhijit Panda, abhijit58@gmail.com, 23110626
Ratna Bibhusan Panda, ratna59@gmail.com, 23110673
Sudhananda Patra, sudhananda60@gmail.com, 23110699
Shibananda Sahu, shibananda61@gmail.com, 24120070
Chandan Kumar Das, chandan62@gmail.com, 23110644
Adwait Prasad Panda, adwait63@gmail.com, 23110551
Subhendu Kumar Satapathy, subhendu64@gmail.com, 23110697
Anusha Santra, anusha65@gmail.com, 24120065
Purna Chandra Murmu, purna66@gmail.com, 23110670
Sukumar Das, sukumar67@gmail.com, 23110700
Arpita Mohapatra, arpita68@gmail.com, 23110637
Rudramadhab Panda, rudra69@gmail.com, 23110674
Satyabrata Nayak, satyabrata70@gmail.com, 23110684
Ankit Kumar Das, ankit71@gmail.com, 23110634
Vaishnavi Sabat, vaishnavi72@gmail.com, 23110702
Ankush Bag, ankush73@gmail.com, 23110635
Prabin Kumar Khamania, prabin74@gmail.com, 23110666
Aditya Narayan Mali, aditya75@gmail.com, 23110630`;

const students = studentsRaw.split('\n').filter(Boolean).map(line => {
  const [name, email, reg_no] = line.split(',').map(s => s.trim());
  return { name, email, reg_no };
});

const subjects = [
  "Computer Networks",
  "Machine Learning",
  "Algorithm Analysis and Design",
  "Software Engineering"
];

const formTypes = [
  { type: "teaching", questions: 12, maxScore: 5 },
  { type: "gap", questions: 10, maxScore: 5 },
  { type: "co", questions: 5, maxScore: 3 }
];

const BASE_URL = 'http://localhost:3001/api/feedback';

function getRandomScore(max) {
  // Return random score between 3 and max
  return Math.floor(Math.random() * (max - 3 + 1)) + 3;
}

function generateAnswers(questions, maxScore) {
  const answers = {};
  for (let i = 1; i <= questions; i++) {
    answers[`Q${i}`] = getRandomScore(maxScore);
  }
  return answers;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSimulation() {
  console.log(`Starting simulation for ${students.length} students across ${subjects.length} subjects.`);
  
  let totalRequests = 0;
  let successfulRequests = 0;
  
  for (const student of students) {
    for (const subject of subjects) {
      for (const form of formTypes) {
        totalRequests++;
        const answers = generateAnswers(form.questions, form.maxScore);
        
        const payload = {
          subject: subject,
          form_type: form.type,
          timestamp: new Date().toISOString(),
          student_name: student.name,
          student_email: student.email,
          reg_no: student.reg_no,
          answers: answers
        };

        try {
          await axios.post(BASE_URL, payload);
          successfulRequests++;
          if (successfulRequests % 50 === 0) {
            console.log(`Submitted ${successfulRequests} responses...`);
          }
        } catch (error) {
          console.error(`Failed for ${student.name} - ${subject} - ${form.type}:`, error.response?.data || error.message);
        }
        
        // Small delay to prevent overwhelming the server
        await sleep(10);
      }
    }
  }
  
  console.log(`\nSimulation Complete! 🎉`);
  console.log(`Successfully submitted ${successfulRequests}/${totalRequests} forms.`);
}

runSimulation();
