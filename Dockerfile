FROM nginx:alpine
ENV PORT=8080
COPY . /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
