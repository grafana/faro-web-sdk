import { DataTypes, Model } from 'sequelize';
import type { InferAttributes, ModelCtor, Sequelize } from 'sequelize';

import type { CommentInputModel, CommentModel } from '../../../common';

export interface CommentShape
  extends CommentModel,
    Model<InferAttributes<CommentShape>, CommentInputModel & Pick<CommentModel, 'articleId' | 'userId'>> {}

export let Comment: ModelCtor<CommentShape>;

export async function initializeComment(db: Sequelize): Promise<void> {
  Comment = db.define<CommentShape>(
    'Comment',
    {
      id: {
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        type: DataTypes.UUID,
        unique: true,
      },
      articleId: {
        allowNull: false,
        type: DataTypes.UUID,
      },
      date: {
        allowNull: false,
        defaultValue: DataTypes.NOW,
        type: DataTypes.DATE,
        get() {
          return new Date(this.getDataValue('date')).getTime();
        },
      },
      text: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      userId: {
        allowNull: false,
        type: DataTypes.UUID,
      },
    },
    {
      timestamps: false,
    }
  );

  await Comment.sync();
}
