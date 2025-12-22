import { QuizQuestion } from "@/components/Quiz";

export const eligibilityQuestions: QuizQuestion[] = [
  {
    id: "eligibility-1",
    question: "To be eligible for a Florida real estate sales associate license, an applicant must be at least how old?",
    options: [
      "16 years old",
      "18 years old",
      "21 years old",
      "25 years old"
    ],
    correctAnswer: 1,
    explanation: {
      correct: "18 years old. Florida statutes require all applicants for a real estate license to be at least 18 years of age.",
      incorrect: [
        "16 years old. This is too young to enter into binding contracts or hold a professional license.",
        "18 years old. Florida statutes require all applicants for a real estate license to be at least 18 years of age.",
        "21 years old. This is not the minimum age requirement.",
        "25 years old. This is not the minimum age requirement."
      ]
    }
  },
  {
    id: "eligibility-2",
    question: "Which of the following is NOT a requirement for a Florida real estate sales associate license?",
    options: [
      "High school diploma or equivalent",
      "United States Social Security Number",
      "United States Citizenship",
      "Being honest and trustworthy"
    ],
    correctAnswer: 2,
    explanation: {
      correct: "United States Citizenship. You do not need to be a U.S. citizen to get a Florida real estate license, but you must have a Social Security Number.",
      incorrect: [
        "High school diploma or equivalent. This is a mandatory education requirement.",
        "United States Social Security Number. This is mandatory for all applicants to ensure compliance with child support laws.",
        "United States Citizenship. You do not need to be a U.S. citizen to get a Florida real estate license, but you must have a Social Security Number.",
        "Being honest and trustworthy. Good moral character is a statutory requirement for licensure."
      ]
    }
  },
  {
    id: "eligibility-3",
    question: "Why is a Social Security Number required for a real estate license application?",
    options: [
      "To verify U.S. citizenship",
      "To check for compliance with child support obligations",
      "To register for voting",
      "To open a bank account for the broker"
    ],
    correctAnswer: 1,
    explanation: {
      correct: "To check for compliance with child support obligations. Florida law requires the collection of Social Security Numbers to determine if the applicant is compliant with any child support orders.",
      incorrect: [
        "To verify U.S. citizenship. Citizenship is not required for licensure.",
        "To check for compliance with child support obligations. Florida law requires the collection of Social Security Numbers to determine if the applicant is compliant with any child support orders.",
        "To register for voting. Voter registration is unrelated to professional licensure.",
        "To open a bank account for the broker. The applicant's SSN is for their personal license, not for brokerage banking."
      ]
    }
  }
];

