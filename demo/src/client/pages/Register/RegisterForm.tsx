import { useEffect } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { faro, UserActionSeverity } from '@grafana/faro-react';
import { UserEventsInstrumentation } from '@grafana/faro-web-sdk/src/instrumentations/userEvents/instrumentation';

import type { AuthRegisterPayload } from '../../../common';
import { usePostRegisterMutation } from '../../api';

export function RegisterForm() {
  const navigate = useNavigate();

  const [register, registerResult] = usePostRegisterMutation();

  const { handleSubmit, register: registerField } = useForm<AuthRegisterPayload>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit((data) => {
    faro.api.pushEvent('registerAttempt');

    register(data);
  });

  useEffect(() => {
    if (!registerResult.isUninitialized && !registerResult.isLoading) {
      if (registerResult.isError) {
        faro.api.pushEvent('registerFailed');
      } else {
        faro.api.pushEvent('registerSuccessfully');

        navigate('/articles');
        UserEventsInstrumentation.stopSubJourney('user_registration');
      }
    }
  }, [registerResult, navigate]);

  useEffect(() => {
    UserEventsInstrumentation.startSubJourney('user_registration');

    return () => {
      UserEventsInstrumentation.stopSubJourney('user_registration');
    };
  }, []);

  return (
    <Form onSubmit={onSubmit}>
      {registerResult.isError && !registerResult.isLoading ? (
        <Alert variant="danger">{(registerResult.error as any).data.data.message}</Alert>
      ) : null}

      <Form.Group className="mb-3" controlId="name">
        <Form.Label>Name</Form.Label>
        <Form.Control type="text" autoComplete="name" {...registerField('name')} />
      </Form.Group>

      <Form.Group className="mb-3" controlId="email">
        <Form.Label>Email</Form.Label>
        <Form.Control type="email" autoComplete="email" {...registerField('email')} />
        <Form.Text>We&apos;ll never share your email with anyone else.</Form.Text>
      </Form.Group>

      <Form.Group className="mb-3" controlId="password">
        <Form.Label>Password</Form.Label>
        <Form.Control type="password" autoComplete="current-password" {...registerField('password')} />
      </Form.Group>

      <Button
        variant="primary"
        type="submit"
        onClick={() => {
          faro.api.startUserAction('register', undefined, { severity: UserActionSeverity.Critical });
        }}
      >
        Register
      </Button>
    </Form>
  );
}
