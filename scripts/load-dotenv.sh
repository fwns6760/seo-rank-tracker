#!/bin/sh

load_dotenv_file() {
  dotenv_file=$1

  if [ ! -f "$dotenv_file" ]; then
    return 0
  fi

  while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    line=$(printf '%s' "$raw_line" | tr -d '\r')

    case "$line" in
      ''|'#'*)
        continue
        ;;
      export\ *)
        line=${line#export }
        ;;
    esac

    key=${line%%=*}
    value=${line#*=}

    if [ "$key" = "$line" ] || [ -z "$key" ]; then
      continue
    fi

    case "$value" in
      \"*\")
        value=${value#\"}
        value=${value%\"}
        ;;
      \'*\')
        value=${value#\'}
        value=${value%\'}
        ;;
    esac

    if [ -z "$value" ]; then
      unset "$key"
    else
      export "$key=$value"
    fi
  done < "$dotenv_file"
}
