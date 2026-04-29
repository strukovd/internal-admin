FROM nginx:stable-alpine

COPY ./.output/public /usr/share/nginx/html
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 3335

CMD ["nginx", "-g", "daemon off;"]
