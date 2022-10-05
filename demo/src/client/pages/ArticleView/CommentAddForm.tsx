import { useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useForm } from 'react-hook-form';

import { agent } from '@grafana/agent-integration-react';

import type { ArticleCommentAddPayload } from '../../../common';
import { usePostArticleCommentMutation } from '../../api';

export type CommentAddFormProps = {
  articleId: string;
};

export function CommentAddForm({ articleId }: CommentAddFormProps) {
  const [createComment, createCommentResult] = usePostArticleCommentMutation();

  const {
    handleSubmit,
    register: registerField,
    reset,
  } = useForm<ArticleCommentAddPayload>({
    defaultValues: {
      text: '',
    },
  });

  const onSubmit = handleSubmit((data) => {
    agent.api.pushEvent('createArticleCommentAttempt', {
      articleId,
    });

    createComment({ ...data, articleId });
  });

  useEffect(() => {
    if (!createCommentResult.isUninitialized && !createCommentResult.isLoading) {
      if (createCommentResult.isError) {
        agent.api.pushEvent('createArticleCommentFailed', {
          articleId,
        });
      } else {
        agent.api.pushEvent('createArticleCommentSuccessfully', {
          articleId,
        });

        reset();
      }
    }
  }, [articleId, createCommentResult, reset]);

  return (
    <Form onSubmit={onSubmit}>
      {createCommentResult.isError && !createCommentResult.isLoading ? (
        <Alert variant="danger">{(createCommentResult.error as any).data.data.message}</Alert>
      ) : null}

      <Form.Group className="mb-3" controlId="text">
        <Form.Label>Text</Form.Label>
        <Form.Control type="text" autoComplete="" {...registerField('text')} />
      </Form.Group>

      <Button variant="primary" type="submit">
        Create Comment
      </Button>
    </Form>
  );
}
