import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Agent from '../components/Agent';
import { getRandomInterviewCover } from '../lib/utils';
import { getFeedbackByInterviewId, getInterviewById } from '../lib/actions';
import { useAuth } from '../context/AuthContext';
import DisplayTechIcons from '../components/DisplayTechIcons';

const InterviewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [interview, setInterview] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coverImage] = useState(() => getRandomInterviewCover());

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const interviewData = await getInterviewById(id);
        if (!interviewData) {
          navigate('/');
          return;
        }
        setInterview(interviewData);

        if (user?.id) {
          const feedbackData = await getFeedbackByInterviewId({
            interviewId: id,
            userId: user.id,
          });
          setFeedback(feedbackData);
        }
      } catch (error) {
        console.error('Error fetching interview details:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user?.id, navigate]);

  if (loading || !interview) return null;

  return (
    <>
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4 items-center max-sm:flex-col">
          <div className="flex flex-row gap-4 items-center">
            <img
              src={coverImage}
              alt="cover-image"
              width={40}
              height={40}
              className="rounded-full object-cover size-[40px]"
            />
            <h3 className="capitalize">{interview.role} Interview</h3>
          </div>

          <DisplayTechIcons techStack={interview.techstack} />
        </div>

        <p className="bg-dark-200 px-4 py-2 rounded-lg h-fit">
          {interview.type}
        </p>
      </div>

      <Agent
        userName={user?.name || ''}
        userId={user?.id}
        interviewId={id}
        type="interview"
        questions={interview.questions}
        feedbackId={feedback?.id}
      />
    </>
  );
};

export default InterviewDetails;
