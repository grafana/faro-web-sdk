import Container from 'react-bootstrap/Container';
import { useParams } from 'react-router-dom';

import { useGetArticleQuery } from '../../api';
import { LoadingScreen, Page } from '../../components';
import { formatDate } from '../../utils';

import { CommentAddForm } from './CommentAddForm';

export function ArticleView() {
  const { id } = useParams();

  const getArticleResult = useGetArticleQuery({ id: id! });

  const isReady = !getArticleResult.isUninitialized && !getArticleResult.isLoading;

  const article = getArticleResult.data?.data!;

  return (
    <Page title={isReady ? article.name! : 'Loading Article'} view="articles">
      {!isReady ? (
        <LoadingScreen />
      ) : (
        <>
          <Container as="article" className="pb-4 mb-4 border-bottom">
            <p className="mb-3">
              {article.user.name} | {formatDate(article.date!)}
            </p>
            <div>{article.text}</div>
          </Container>
          <h4 className="pb-2">Comments</h4>
          {article.comments.length ? (
            article.comments.map((comment) => (
              <Container key={comment.id} className="pb-2 mt-2 border-bottom">
                <p className="mb-2">{comment.user.name}</p>
                <p className="mb-0">{comment.text}</p>
              </Container>
            ))
          ) : (
            <Container className="pb-2 mt-2 border-bottom">
              <p>No comments yet.</p>
            </Container>
          )}
          <h4 className="pb-2 mt-2">Add Comment</h4>
          <CommentAddForm articleId={id!} />
        </>
      )}
    </Page>
  );
}
