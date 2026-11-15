import Agent from '../components/Agent';
import { useAuth } from '../context/AuthContext';

const Interview = () => {
  const { user } = useAuth();

  return (
    <>
      <h3>Interview generation</h3>

      <Agent
        userName={user?.name || ''}
        userId={user?.id}
        profileImage={user?.profileURL}
        type="generate"
      />
    </>
  );
};

export default Interview;
